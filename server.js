const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS || "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// CORS middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS || "*",
    credentials: true
}));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    message: 'Too many requests from this IP'
});

// General rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500 // limit each IP to 500 requests per windowMs
});

app.use('/api/', apiLimiter);
app.use(generalLimiter);

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
    console.log('Processing packet:', packet.type, 'from', packet.from);
    
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
        console.log(`Broadcast message from ${packet.from}`);
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
            console.log(`Updated position for ${packet.from}: ${lat}, ${lng}`);
        }
    }
}

// WebSocket connection with rate limiting
const connectedClients = new Set();
const MAX_CLIENTS = 100;

io.on('connection', (socket) => {
    // Limit concurrent connections
    if (connectedClients.size >= MAX_CLIENTS) {
        console.log('Max clients reached, rejecting connection');
        socket.disconnect();
        return;
    }
    
    connectedClients.add(socket.id);
    console.log(`Client connected: ${socket.id} (${connectedClients.size} total)`);
    
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
    
    console.log(`Sent initial data: ${enrichedMessages.length} messages, ${enrichedPositions.length} positions`);
    
    socket.on('disconnect', () => {
        connectedClients.delete(socket.id);
        console.log(`Client disconnected: ${socket.id} (${connectedClients.size} total)`);
    });
});

// Start Python listener only if enabled (for local development)
let pythonProcess = null;
if (process.env.ENABLE_PYTHON_LISTENER === 'true') {
    console.log('Starting Python listener...');
    pythonProcess = spawn('python3', ['-u', 'meshtastic_listener.py']);

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
} else {
    console.log('Python listener disabled - running in cloud mode');
    console.log('Waiting for data from remote clients via /api/message endpoint');
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        connections: connectedClients.size,
        pythonListenerEnabled: process.env.ENABLE_PYTHON_LISTENER === 'true',
        messages: recentMessages.length,
        positions: nodePositions.size,
        nodes: Array.from(nodePositions.keys())
    });
});

// API endpoint to receive messages from external sources (Raspberry Pi)
app.post('/api/message', (req, res) => {
    console.log('Received POST to /api/message');
    const { type, data } = req.body;
    
    if (!type || !data) {
        console.error('Missing type or data in request');
        return res.status(400).json({ error: 'Missing type or data' });
    }
    
    console.log(`Processing ${type} packet from ${data.from}`);
    
    // Process the packet as if it came from Python
    processPacket(data);
    
    res.json({ success: true, message: 'Data received and broadcast' });
});

// Batch endpoint for multiple messages at once (more efficient)
app.post('/api/messages/batch', (req, res) => {
    console.log('Received batch POST to /api/messages/batch');
    const { messages } = req.body;
    
    if (!Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages must be an array' });
    }
    
    let processed = 0;
    for (const msg of messages) {
        if (msg.type && msg.data) {
            processPacket(msg.data);
            processed++;
        }
    }
    
    console.log(`Processed ${processed} messages in batch`);
    res.json({ success: true, processed });
});

// Debug endpoint to view current state (remove in production)
app.get('/api/debug', (req, res) => {
    res.json({
        messages: recentMessages,
        positions: Array.from(nodePositions.entries()),
        telemetry: Array.from(nodeTelemetry.entries()),
        clients: connectedClients.size
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Mode: ${process.env.ENABLE_PYTHON_LISTENER === 'true' ? 'LOCAL' : 'CLOUD'}`);
    console.log(`WebSocket endpoint: ws://0.0.0.0:${PORT}`);
    console.log(`API endpoint: http://0.0.0.0:${PORT}/api/message`);
    console.log(`=================================`);
});

// Cleanup
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (pythonProcess) {
        pythonProcess.kill();
    }
    server.close(() => {
        console.log('Server closed');
        process.exit();
    });
});