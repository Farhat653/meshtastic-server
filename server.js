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

// Node ID to Name mapping
const NODE_NAMES = {
    '0x336879dc': 'Node Echo',
    '0x9e7595c4': 'Node Charlie',
    '0x9e755a5c': 'Node Alpha',
    '0x9e76074c': 'Node Foxtrot',
    '0x9e75877c': 'Node Delta',
    '0xdb58af14': 'Node Bravo',
    '0x336679e4': 'Staion Node'
};

// Helper function to get node name
function getNodeName(nodeId) {
    return NODE_NAMES[nodeId] || nodeId;
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow WebSocket connections
}));

// Add JSON body parser for API endpoints
app.use(express.json({ limit: '10mb' }));

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

// ============================================================================
// NEW:  ENDPOINTS FOR PYTHON SCRIPT CLOUD MODE
// ============================================================================

// Batch message receiver endpoint
app.post('/api/messages/batch', (req, res) => {
    try {
        const { messages: batchMessages } = req.body;
        
        if (!batchMessages || !Array.isArray(batchMessages)) {
            return res.status(400).json({ error: 'Invalid batch format' });
        }

        let processed = {
            messages: 0,
            telemetry: 0,
            positions: 0
        };

        // Track unique nodes for each type
        const messageNodes = new Set();
        const telemetryNodes = new Set();
        const positionNodes = new Set();

        // Process each message in the batch
        batchMessages.forEach(item => {
            const { type, data } = item;

            switch(type) {
                case 'message':
                    if (data.message) {
                        const packet = {
                            type: 'message',
                            timestamp: data.timestamp,
                            from: data.from,
                            message: data.message,
                            location: data.location,
                            altitude: data.altitude,
                            rssi: data.rssi,
                            snr: data.snr,
                            battery: data.battery,
                            mapLink: data.mapLink
                        };
                        
                        recentMessages.push(packet);
                        if (recentMessages.length > MAX_MESSAGES) {
                            recentMessages.shift();
                        }
                        io.emit('new-message', packet);
                        processed.messages++;
                        messageNodes.add(data.from);
                    }
                    break;

                case 'position':
                    if (data.location) {
                        const [lat, lng] = data.location.split(',').map(s => parseFloat(s.trim()));
                        if (!isNaN(lat) && !isNaN(lng)) {
                            const posData = {
                                lat,
                                lng,
                                from: data.from,
                                timestamp: data.timestamp,
                                altitude: data.altitude,
                                battery: data.battery,
                                rssi: data.rssi,
                                snr: data.snr
                            };
                            
                            nodePositions.set(data.from, posData);
                            io.emit('position-update', posData);
                            processed.positions++;
                            positionNodes.add(data.from);
                        }
                    }
                    break;

                case 'telemetry':
                    if (data.from) {
                        const telemetryData = {
                            battery: data.battery,
                            voltage: data.voltage,
                            channelUtil: data.channelUtil,
                            airUtil: data.airUtil,
                            uptime: data.uptime,
                            timestamp: data.timestamp
                        };
                        
                        nodeTelemetry.set(data.from, telemetryData);
                        
                        // Update battery in existing position if available
                        if (nodePositions.has(data.from)) {
                            const pos = nodePositions.get(data.from);
                            pos.battery = data.battery;
                            nodePositions.set(data.from, pos);
                        }
                        
                        io.emit('telemetry-update', {
                            from: data.from,
                            ...telemetryData
                        });
                        
                        processed.telemetry++;
                        telemetryNodes.add(data.from);
                    }
                    break;
            }
        });

        // Build detailed log message
        const logParts = [];
        
        if (processed.messages > 0) {
            const nodes = Array.from(messageNodes).map(getNodeName).join(', ');
            logParts.push(`${processed.messages} msg (${nodes})`);
        }
        
        if (processed.positions > 0) {
            const nodes = Array.from(positionNodes).map(getNodeName).join(', ');
            logParts.push(`${processed.positions} pos (${nodes})`);
        }
        
        if (processed.telemetry > 0) {
            const nodes = Array.from(telemetryNodes).map(getNodeName).join(', ');
            logParts.push(`${processed.telemetry} telem (${nodes})`);
        }

        const logMessage = logParts.length > 0 
            ? `✓ API Batch processed: ${logParts.join(', ')}`
            : '✓ API Batch processed: no data';

        console.log(logMessage);

        res.json({ 
            success: true, 
            processed
        });

    } catch (error) {
        console.error(`❌ Error processing batch: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Delete a specific message
app.post('/api/messages/delete', (req, res) => {
    try {
        const { messageId } = req.body;
        
        if (!messageId) {
            return res.status(400).json({ error: 'Message ID required' });
        }

        const initialCount = recentMessages.length;
        const index = recentMessages.findIndex(msg => msg.id === messageId);
        
        if (index !== -1) {
            recentMessages.splice(index, 1);
            console.log(`🗑️  Deleted message: ${messageId}`);
            
            // Notify all clients
            io.emit('message-deleted', { messageId });
            
            res.json({ success: true, deleted: true });
        } else {
            res.status(404).json({ success: false, message: 'Message not found' });
        }

    } catch (error) {
        console.error(`❌ Error deleting message: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Clear all messages
app.post('/api/messages/clear', (req, res) => {
    try {
        const totalCleared = recentMessages.length + nodePositions.size + nodeTelemetry.size;
        
        recentMessages.length = 0;
        nodePositions.clear();
        nodeTelemetry.clear();
        
        console.log(`🗑️  Cleared all data: ${totalCleared} items`);
        
        // Notify all clients
        io.emit('all-cleared');
        
        res.json({ 
            success: true, 
            cleared: totalCleared 
        });

    } catch (error) {
        console.error(`❌ Error clearing messages: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ORIGINAL CODE: Parse Python script output
// ============================================================================

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
        
        console.log(`Updated telemetry for ${getNodeName(packet.from)}: ${packet.battery}`);
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
        connections: connectedClients.size,
        messages: recentMessages.length,
        nodes: nodePositions.size
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Access from network: http://YOUR_IP:${PORT}`);
    console.log(`API endpoints available:`);
    console.log(`  POST /api/messages/batch   - Receive batch messages`);
    console.log(`  POST /api/messages/delete  - Delete a message`);
    console.log(`  POST /api/messages/clear   - Clear all messages`);
    console.log(`  GET  /health               - Server health check`);
});

// Cleanup
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    pythonProcess.kill();
    process.exit();
});
