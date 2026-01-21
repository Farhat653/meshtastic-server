const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS || "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow WebSocket connections
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Serve static files
app.use(express.static('public'));

// Store recent messages and positions
const recentMessages = [];
const nodePositions = new Map();
const nodeTelemetry = new Map();
const MAX_MESSAGES = 50;

// Parse Python script output
function parsePythonOutput(data) {
    const lines = data.toString().split('\n');
    let currentPacket = null;
    
    for (let line of lines) {
        line = line.trim();
        
        if (line.includes('📨 MESSAGE') || line.includes('📍 POSITION UPDATE') || line.includes('📊 TELEMETRY')) {
            if (currentPacket) {
                processPacket(currentPacket);
            }
            
            const timestamp = line.match(/\[(.*?)\]/)?.[1];
            let packetType = 'unknown';
            if (line.includes('📨 MESSAGE')) packetType = 'message';
            else if (line.includes('📍 POSITION UPDATE')) packetType = 'position';
            else if (line.includes('📊 TELEMETRY')) packetType = 'telemetry';
            
            currentPacket = {
                type: packetType,
                timestamp: timestamp || new Date().toISOString(),
                from: null,
                message: null,
                location: null,
                altitude: null,
                rssi: null,
                snr: null,
                battery: null,
                voltage: null,
                channelUtil: null,
                airUtil: null,
                uptime: null,
                mapLink: null
            };
        }
        else if (currentPacket) {
            if (line.startsWith('From:')) {
                currentPacket.from = line.replace('From:', '').trim();
            }
            else if (line.startsWith('Battery:')) {
                const batteryMatch = line.match(/Battery:\s*(\d+)%/);
                const voltageMatch = line.match(/Voltage:\s*([\d.]+)V/);
                if (batteryMatch) currentPacket.battery = batteryMatch[1] + '%';
                if (voltageMatch) currentPacket.voltage = voltageMatch[1] + 'V';
            }
            else if (line.startsWith('Channel Util:')) {
                const channelMatch = line.match(/Channel Util:\s*([\d.]+)%/);
                const airMatch = line.match(/Air Util TX:\s*([\d.]+)%/);
                if (channelMatch) currentPacket.channelUtil = channelMatch[1];
                if (airMatch) currentPacket.airUtil = airMatch[1];
            }
            else if (line.startsWith('Uptime:')) {
                const uptimeMatch = line.match(/Uptime:\s*([\d.]+)\s*hours/);
                if (uptimeMatch) currentPacket.uptime = uptimeMatch[1];
            }
            else if (line.startsWith('Location:')) {
                const locMatch = line.match(/Location:\s*([-\d.]+,\s*[-\d.]+)/);
                if (locMatch) currentPacket.location = locMatch[1];
                const altMatch = line.match(/Altitude:\s*(\d+m)/);
                if (altMatch) currentPacket.altitude = altMatch[1];
            }
            else if (line.startsWith('RSSI:')) {
                const rssiMatch = line.match(/RSSI:\s*([-\d.]+|N\/A)/);
                const snrMatch = line.match(/SNR:\s*([-\d.]+|N\/A)/);
                const batteryMatch = line.match(/Battery:\s*([^\s]+.*?)(?:\s*$)/);
                
                if (rssiMatch) currentPacket.rssi = rssiMatch[1];
                if (snrMatch) currentPacket.snr = snrMatch[1];
                if (batteryMatch && batteryMatch[1] !== 'N/A') currentPacket.battery = batteryMatch[1];
            }
            else if (line.startsWith('Map:')) {
                currentPacket.mapLink = line.replace('Map:', '').trim();
            }
            else if (currentPacket.type === 'message' && !line.startsWith('=') && line.length > 0 && 
                     !line.startsWith('From:') && !line.startsWith('RSSI:') && !line.startsWith('Map:')) {
                if (!currentPacket.message) {
                    currentPacket.message = line;
                }
            }
        }
    }
    
    if (currentPacket) {
        processPacket(currentPacket);
    }
}

function processPacket(packet) {
    if (packet.type === 'telemetry' && packet.from) {
        const telemetryData = {
            battery: packet.battery,
            voltage: packet.voltage,
            channelUtil: packet.channelUtil,
            airUtil: packet.airUtil,
            uptime: packet.uptime,
            timestamp: packet.timestamp
        };
        
        nodeTelemetry.set(packet.from, telemetryData);
        
        if (nodePositions.has(packet.from)) {
            const pos = nodePositions.get(packet.from);
            pos.battery = packet.battery;
            nodePositions.set(packet.from, pos);
        }
        
        io.emit('telemetry-update', {
            from: packet.from,
            ...telemetryData
        });
        
        console.log(`Updated telemetry for ${packet.from}: ${packet.battery}`);
    }
    
    if (packet.type === 'message' && packet.message) {
        if (!packet.battery || packet.battery === 'N/A') {
            if (nodeTelemetry.has(packet.from)) {
                packet.battery = nodeTelemetry.get(packet.from).battery;
            }
        }
        
        recentMessages.push(packet);
        if (recentMessages.length > MAX_MESSAGES) {
            recentMessages.shift();
        }
        io.emit('new-message', packet);
    }
    
    if (packet.location) {
        const [lat, lng] = packet.location.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
            if (!packet.battery || packet.battery === 'N/A') {
                if (nodeTelemetry.has(packet.from)) {
                    packet.battery = nodeTelemetry.get(packet.from).battery;
                }
            }
            
            const posData = {
                lat,
                lng,
                from: packet.from,
                timestamp: packet.timestamp,
                altitude: packet.altitude,
                battery: packet.battery,
                rssi: packet.rssi,
                snr: packet.snr
            };
            
            nodePositions.set(packet.from, posData);
            io.emit('position-update', posData);
        }
    }
}

// WebSocket connection with rate limiting
const connectedClients = new Set();
const MAX_CLIENTS = 100;

io.on('connection', (socket) => {
    // Limit concurrent connections
    if (connectedClients.size >= MAX_CLIENTS) {
        socket.disconnect();
        return;
    }
    
    connectedClients.add(socket.id);
    console.log(`Client connected (${connectedClients.size} total)`);
    
    const enrichedMessages = recentMessages.map(msg => {
        if (nodeTelemetry.has(msg.from) && (!msg.battery || msg.battery === 'N/A')) {
            return { ...msg, battery: nodeTelemetry.get(msg.from).battery };
        }
        return msg;
    });
    
    const enrichedPositions = Array.from(nodePositions.values()).map(pos => {
        if (nodeTelemetry.has(pos.from) && (!pos.battery || pos.battery === 'N/A')) {
            return { ...pos, battery: nodeTelemetry.get(pos.from).battery };
        }
        return pos;
    });
    
    socket.emit('initial-data', {
        messages: enrichedMessages,
        positions: enrichedPositions
    });
    
    socket.on('disconnect', () => {
        connectedClients.delete(socket.id);
        console.log(`Client disconnected (${connectedClients.size} total)`);
    });
});

// Start Python listener
const pythonProcess = spawn('python3', ['-u', 'meshtastic_listener.py']);

pythonProcess.stdout.on('data', (data) => {
    console.log(data.toString());
    parsePythonOutput(data);
});

pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
});

pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        connections: connectedClients.size 
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Access from network: http://YOUR_IP:${PORT}`);
});

// Cleanup
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    pythonProcess.kill();
    process.exit();
});
