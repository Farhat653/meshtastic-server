#!/usr/bin/env python3
import meshtastic
import meshtastic.serial_interface
from pubsub import pub
from datetime import datetime
import time
import sys
import os
import requests
from threading import Thread
from queue import Queue
import hashlib

# Force unbuffered output so Node.js can read it in real-time
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Cloud server configuration
SERVER_URL = os.getenv('SERVER_URL', None)
CLOUD_MODE = SERVER_URL is not None

# Message queue for batch sending
message_queue = Queue()
BATCH_SIZE = 5
BATCH_TIMEOUT = 3  # seconds

# Custom node name mapping - THESE TAKE PRIORITY OVER DEVICE NAMES
NODE_NAMES = {
    0x33687054: "Not working",
    0x336879dc: "Node Echo",
    0x9e7595c4: "Node Charlie",
    0x9e755a5c: "Node Alpha",
    0x9e76074c: "Node Foxtrot",
    0x9e75877c: "Node Delta",
    0xdb58af14: "Node Bravo"
    0x336679e4: "Master Node"
}

# Print the node mapping on startup for verification
print("\n" + "="*60)
print("NODE MAPPING LOADED:")
for node_id, name in NODE_NAMES.items():
    print(f"  0x{node_id:08x} -> {name}")
print("="*60 + "\n")
sys.stdout.flush()

# Store telemetry data for each node
node_telemetry = {}

# Store message IDs to prevent duplicates
seen_messages = set()
seen_positions = {}  # Store last position per node
MESSAGE_CACHE_SIZE = 1000  # Keep last 1000 message IDs

# Store all messages with IDs for deletion
stored_messages = []
message_counter = 0

def generate_message_id(packet, content_type):
    """Generate unique ID for message/position to detect duplicates"""
    # Create hash from packet data
    if content_type == "message":
        data = f"{packet.get('from')}_{packet['decoded'].get('text')}_{packet.get('rxTime', time.time())}"
    elif content_type == "position":
        pos = packet['decoded']['position']
        data = f"{packet.get('from')}_{pos.get('latitude')}_{pos.get('longitude')}_{packet.get('rxTime', time.time())}"
    else:
        data = f"{packet.get('from')}_{content_type}_{packet.get('rxTime', time.time())}"
    
    return hashlib.md5(data.encode()).hexdigest()

def is_duplicate_message(packet):
    """Check if we've already seen this exact message"""
    msg_id = generate_message_id(packet, "message")
    
    if msg_id in seen_messages:
        return True
    
    seen_messages.add(msg_id)
    
    # Limit cache size
    if len(seen_messages) > MESSAGE_CACHE_SIZE:
        seen_messages.pop()
    
    return False

def is_duplicate_position(packet):
    """Check if this is a duplicate position update"""
    sender_id = packet['from']
    position = packet['decoded']['position']
    
    latitude = position.get('latitude')
    longitude = position.get('longitude')
    altitude = position.get('altitude')
    
    # Create position signature
    pos_sig = f"{latitude:.6f}_{longitude:.6f}_{altitude}"
    
    # Check if we've seen this exact position from this node
    if sender_id in seen_positions:
        if seen_positions[sender_id] == pos_sig:
            return True
    
    # Store this position
    seen_positions[sender_id] = pos_sig
    return False

def delete_message(message_id):
    """Delete a message by ID"""
    global stored_messages
    
    initial_count = len(stored_messages)
    stored_messages = [msg for msg in stored_messages if msg['id'] != message_id]
    
    deleted = initial_count - len(stored_messages)
    
    if deleted > 0:
        print(f"🗑️  Deleted message ID: {message_id}")
        
        # Send delete command to cloud
        if CLOUD_MODE:
            try:
                response = requests.post(
                    f"{SERVER_URL}/api/messages/delete",
                    json={'messageId': message_id},
                    timeout=5
                )
                if response.status_code == 200:
                    print(f"☁️  ✓ Message deleted from cloud")
                else:
                    print(f"☁️  ✗ Failed to delete from cloud: {response.status_code}")
            except Exception as e:
                print(f"☁️  ✗ Cloud delete error: {e}")
        
        sys.stdout.flush()
        return True
    else:
        print(f"❌ Message ID {message_id} not found")
        sys.stdout.flush()
        return False

def clear_all_messages():
    """Clear all stored messages"""
    global stored_messages, seen_messages, seen_positions
    
    count = len(stored_messages)
    stored_messages.clear()
    seen_messages.clear()
    seen_positions.clear()
    
    print(f"🗑️  Cleared {count} messages from local storage")
    
    # Send clear command to cloud
    if CLOUD_MODE:
        try:
            response = requests.post(
                f"{SERVER_URL}/api/messages/clear",
                timeout=5
            )
            if response.status_code == 200:
                print(f"☁️  ✓ All messages cleared from cloud")
            else:
                print(f"☁️  ✗ Failed to clear cloud: {response.status_code}")
        except Exception as e:
            print(f"☁️  ✗ Cloud clear error: {e}")
    
    sys.stdout.flush()

def format_coordinates(latitude, longitude):
    """Format coordinates for Google Maps"""
    if latitude and longitude:
        return f"{latitude:.6f}, {longitude:.6f}"
    return "N/A"

def get_google_maps_link(latitude, longitude):
    """Generate Google Maps link"""
    if latitude and longitude:
        return f"https://maps.google.com/?q={latitude},{longitude}"
    return None

def get_node_name(sender_id, interface):
    """Get node name - CUSTOM MAPPING TAKES PRIORITY"""
    # ALWAYS check custom mapping FIRST
    if sender_id in NODE_NAMES:
        return NODE_NAMES[sender_id]
    
    # Only if not in custom mapping, try to get name from device info
    if sender_id in interface.nodes:
        node = interface.nodes[sender_id]
        if 'user' in node and 'longName' in node['user']:
            return node['user']['longName']
        elif 'user' in node and 'shortName' in node['user']:
            return node['user']['shortName']
    
    # Fallback to hex ID if not found anywhere
    return f"0x{sender_id:08x}"

def get_battery_info(sender_id):
    """Get battery information for a node from cached telemetry"""
    if sender_id in node_telemetry:
        telemetry = node_telemetry[sender_id]
        voltage = telemetry.get('voltage')
        battery_level = telemetry.get('batteryLevel')
        
        if voltage and battery_level is not None:
            return f"{voltage:.2f}V ({battery_level}%)"
        elif voltage:
            return f"{voltage:.2f}V"
        elif battery_level is not None:
            return f"{battery_level}%"
    
    return "N/A"

def send_to_cloud(packet_data):
    """Send packet data to cloud server queue"""
    if not CLOUD_MODE:
        return
    
    try:
        message_queue.put(packet_data)
    except Exception as e:
        print(f"Error queuing message: {e}")
        sys.stdout.flush()

def cloud_sender_thread():
    """Background thread to send messages to cloud in batches"""
    if not CLOUD_MODE:
        return
    
    batch = []
    last_send_time = time.time()
    
    print(f"☁️  Cloud sender started - forwarding to {SERVER_URL}")
    sys.stdout.flush()
    
    while True:
        try:
            # Try to get a message with timeout
            try:
                msg = message_queue.get(timeout=1)
                batch.append(msg)
            except:
                pass
            
            current_time = time.time()
            should_send = (
                len(batch) >= BATCH_SIZE or 
                (len(batch) > 0 and (current_time - last_send_time) >= BATCH_TIMEOUT)
            )
            
            if should_send and batch:
                try:
                    response = requests.post(
                        f"{SERVER_URL}/api/messages/batch",
                        json={'messages': batch},
                        timeout=10
                    )
                    if response.status_code == 200:
                        print(f"☁️  ✓ Sent {len(batch)} messages to cloud")
                    else:
                        print(f"☁️  ✗ Cloud returned {response.status_code}")
                    sys.stdout.flush()
                except requests.exceptions.RequestException as e:
                    print(f"☁️  ✗ Failed to send to cloud: {e}")
                    sys.stdout.flush()
                
                batch.clear()
                last_send_time = current_time
                
        except Exception as e:
            print(f"Cloud sender error: {e}")
            sys.stdout.flush()
            time.sleep(1)

def onTelemetry(packet, interface):
    """Handle telemetry updates (battery, voltage, etc.)"""
    if 'decoded' in packet and 'telemetry' in packet['decoded']:
        sender_id = packet['from']
        sender_name = get_node_name(sender_id, interface)
        
        telemetry = packet['decoded']['telemetry']
        
        # Check for device metrics (battery, voltage, etc.)
        if 'deviceMetrics' in telemetry:
            metrics = telemetry['deviceMetrics']
            
            # Store telemetry data for this node
            node_telemetry[sender_id] = {
                'batteryLevel': metrics.get('batteryLevel'),
                'voltage': metrics.get('voltage'),
                'channelUtilization': metrics.get('channelUtilization'),
                'airUtilTx': metrics.get('airUtilTx'),
                'uptimeSeconds': metrics.get('uptimeSeconds'),
                'timestamp': datetime.now()
            }
            
            battery_level = metrics.get('batteryLevel', 'N/A')
            voltage = metrics.get('voltage', 'N/A')
            channel_util = metrics.get('channelUtilization', 'N/A')
            air_util = metrics.get('airUtilTx', 'N/A')
            uptime = metrics.get('uptimeSeconds', 'N/A')
            
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Only skip printing if it's an unknown node (hex ID format)
            if not sender_name.startswith("0x"):
                print(f"\n{'='*60}")
                print(f"📊 TELEMETRY [{timestamp}]")
                print(f"From: {sender_name}")
                print(f"Battery: {battery_level}% | Voltage: {voltage}V")
                print(f"Channel Util: {channel_util}% | Air Util TX: {air_util}%")
                if uptime != 'N/A':
                    uptime_hours = uptime / 3600
                    print(f"Uptime: {uptime_hours:.1f} hours")
                print(f"{'='*60}\n")
                sys.stdout.flush()
            
            # Send to cloud
            if CLOUD_MODE:
                send_to_cloud({
                    'type': 'telemetry',
                    'data': {
                        'type': 'telemetry',
                        'timestamp': timestamp,
                        'from': sender_name,
                        'battery': f"{battery_level}%" if battery_level != 'N/A' else None,
                        'voltage': f"{voltage}V" if voltage != 'N/A' else None,
                        'channelUtil': str(channel_util) if channel_util != 'N/A' else None,
                        'airUtil': str(air_util) if air_util != 'N/A' else None,
                        'uptime': str(uptime / 3600) if uptime != 'N/A' else None
                    }
                })

def onReceive(packet, interface):
    """Handle text messages"""
    global message_counter, stored_messages
    
    if 'decoded' in packet and 'text' in packet['decoded']:
        # Check for duplicates first
        if is_duplicate_message(packet):
            return  # Skip duplicate message
        
        sender_id = packet['from']
        message = packet['decoded']['text']
        rssi = packet.get('rxRssi', 'N/A')
        snr = packet.get('rxSnr', 'N/A')
        
        # Get timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if 'rxTime' in packet:
            timestamp = datetime.fromtimestamp(packet['rxTime']).strftime("%Y-%m-%d %H:%M:%S")
        
        sender_name = get_node_name(sender_id, interface)
        battery_info = get_battery_info(sender_id)
        
        # Get GPS position
        latitude = None
        longitude = None
        altitude = None
        
        if sender_id in interface.nodes:
            node = interface.nodes[sender_id]
            if 'position' in node:
                pos = node['position']
                if 'latitude' in pos and 'longitude' in pos:
                    latitude = pos['latitude']
                    longitude = pos['longitude']
                if 'altitude' in pos:
                    altitude = pos['altitude']
        
        # Format GPS information
        coords = format_coordinates(latitude, longitude)
        location_info = coords if coords != "N/A" else "N/A"
        altitude_info = f"{altitude}m" if altitude else "N/A"
        
        # Generate message ID
        message_counter += 1
        msg_id = f"msg_{message_counter}_{int(time.time())}"
        
        print(f"\n{'='*60}")
        print(f"📨 MESSAGE [ID: {msg_id}] [{timestamp}]")
        print(f"From: {sender_name}")
        print(f"{message}")
        print(f"RSSI: {rssi} dBm | SNR: {snr} dB | Battery: {battery_info}")
        
        if coords != "N/A":
            maps_link = get_google_maps_link(latitude, longitude)
            if maps_link:
                print(f"Map: {maps_link}")
        
        print(f"{'='*60}\n")
        sys.stdout.flush()
        
        # Store message locally
        stored_messages.append({
            'id': msg_id,
            'type': 'message',
            'timestamp': timestamp,
            'from': sender_name,
            'message': message
        })
        
        # Send to cloud
        if CLOUD_MODE:
            send_to_cloud({
                'type': 'message',
                'data': {
                    'id': msg_id,
                    'type': 'message',
                    'timestamp': timestamp,
                    'from': sender_name,
                    'message': message,
                    'location': coords if coords != "N/A" else None,
                    'altitude': altitude_info if altitude_info != "N/A" else None,
                    'rssi': str(rssi) if rssi != 'N/A' else None,
                    'snr': str(snr) if snr != 'N/A' else None,
                    'battery': battery_info if battery_info != "N/A" else None,
                    'mapLink': get_google_maps_link(latitude, longitude) if coords != "N/A" else None
                }
            })

def onPosition(packet, interface):
    """Handle position updates"""
    global message_counter, stored_messages
    
    if 'decoded' in packet and 'position' in packet['decoded']:
        # Check for duplicates first
        if is_duplicate_position(packet):
            return  # Skip duplicate position
        
        sender_id = packet['from']
        position = packet['decoded']['position']
        
        latitude = position.get('latitude')
        longitude = position.get('longitude')
        altitude = position.get('altitude')
        
        # Skip if no valid coordinates
        if not latitude or not longitude:
            return
        
        rssi = packet.get('rxRssi', 'N/A')
        snr = packet.get('rxSnr', 'N/A')
        
        # Get timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if 'rxTime' in packet:
            timestamp = datetime.fromtimestamp(packet['rxTime']).strftime("%Y-%m-%d %H:%M:%S")
        
        sender_name = get_node_name(sender_id, interface)
        battery_info = get_battery_info(sender_id)
        
        # Format GPS information
        coords = format_coordinates(latitude, longitude)
        altitude_info = f"{altitude}m" if altitude else "N/A"
        
        # Generate message ID
        message_counter += 1
        msg_id = f"pos_{message_counter}_{int(time.time())}"
        
        print(f"\n{'='*60}")
        print(f"📍 POSITION UPDATE [ID: {msg_id}] [{timestamp}]")
        print(f"From: {sender_name}")
        print(f"Location: {coords} | Altitude: {altitude_info}")
        print(f"RSSI: {rssi} dBm | SNR: {snr} dB | Battery: {battery_info}")
        
        maps_link = get_google_maps_link(latitude, longitude)
        if maps_link:
            print(f"Map: {maps_link}")
        
        print(f"{'='*60}\n")
        sys.stdout.flush()
        
        # Store message locally
        stored_messages.append({
            'id': msg_id,
            'type': 'position',
            'timestamp': timestamp,
            'from': sender_name,
            'location': coords
        })
        
        # Send to cloud
        if CLOUD_MODE:
            send_to_cloud({
                'type': 'position',
                'data': {
                    'id': msg_id,
                    'type': 'position',
                    'timestamp': timestamp,
                    'from': sender_name,
                    'location': coords,
                    'altitude': altitude_info,
                    'rssi': str(rssi) if rssi != 'N/A' else None,
                    'snr': str(snr) if snr != 'N/A' else None,
                    'battery': battery_info if battery_info != "N/A" else None,
                    'mapLink': maps_link
                }
            })

# Connect
print("Connecting to Meshtastic device...")
if CLOUD_MODE:
    print(f"☁️  Cloud mode enabled - will forward to {SERVER_URL}")
else:
    print("🏠 Local mode - no cloud forwarding")

print("\nCommands:")
print("  Type 'delete <id>' to delete a message (e.g., 'delete msg_1_1234567890')")
print("  Type 'clear' to delete all messages")
print("  Press Ctrl+C to exit\n")
sys.stdout.flush()

interface = meshtastic.serial_interface.SerialInterface('/dev/ttyUSB0')

# Subscribe to messages, position updates, and telemetry
pub.subscribe(onReceive, "meshtastic.receive.text")
pub.subscribe(onPosition, "meshtastic.receive.position")
pub.subscribe(onTelemetry, "meshtastic.receive.telemetry")

# Start cloud sender thread if in cloud mode
if CLOUD_MODE:
    sender_thread = Thread(target=cloud_sender_thread, daemon=True)
    sender_thread.start()

print("Listening for messages, position updates, and telemetry...\n")
sys.stdout.flush()

try:
    while True:
        time.sleep(0.1)
        # You can add command input handling here if running interactively
except KeyboardInterrupt:
    print("\nStopping...")
    interface.close()
