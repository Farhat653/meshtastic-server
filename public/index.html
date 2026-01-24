<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meshtastic Monitor</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            height: 100vh;
            overflow: hidden;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        /* Dark mode (default) */
        body.dark-mode {
            background: #1a1a2e;
            color: #eee;
        }
        
        body.dark-mode header {
            background: #16213e;
        }
        
        body.dark-mode .nodes-status {
            background: #0f3460;
        }
        
        body.dark-mode .node-badge {
            background: #1a1a2e;
        }
        
        body.dark-mode .sidebar {
            background: #16213e;
        }
        
        body.dark-mode .sidebar-header {
            background: #0f3460;
        }
        
        body.dark-mode .message-card,
        body.dark-mode .position-card {
            background: #0f3460;
        }
        
        body.dark-mode .location-entry {
            background: #0f3460;
        }
        
        body.dark-mode .message-meta {
            border-top-color: #1a1a2e;
        }
        
        body.dark-mode ::-webkit-scrollbar-track {
            background: #1a1a2e;
        }
        
        body.dark-mode .leaflet-popup-content-wrapper {
            background: #16213e;
            color: #eee;
        }
        
        /* Light mode */
        body.light-mode {
            background: #f5f5f5;
            color: #333;
        }
        
        body.light-mode header {
            background: #ffffff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        body.light-mode h1 {
            color: #0066cc !important;
        }
        
        body.light-mode .nodes-status {
            background: #e8f4f8;
        }
        
        body.light-mode .node-count {
            color: #0066cc !important;
        }
        
        body.light-mode .node-badge {
            background: #ffffff;
            border-color: #0066cc !important;
        }
        
        body.light-mode .sidebar {
            background: #ffffff;
        }
        
        body.light-mode .sidebar-header {
            background: #e8f4f8;
            color: #333;
        }
        
        body.light-mode .message-card,
        body.light-mode .position-card {
            background: #f8f9fa;
            border-left-color: #0066cc !important;
        }
        
        body.light-mode .location-entry {
            background: #f8f9fa;
        }
        
        body.light-mode .message-from {
            color: #0066cc !important;
        }
        
        body.light-mode .message-header,
        body.light-mode .message-meta {
            color: #666;
        }
        
        body.light-mode .location-header {
            color: #666;
        }
        
        body.light-mode .location-node {
            color: #0066cc !important;
        }
        
        body.light-mode .message-meta {
            border-top-color: #e0e0e0;
        }
        
        body.light-mode ::-webkit-scrollbar-track {
            background: #f0f0f0;
        }
        
        body.light-mode ::-webkit-scrollbar-thumb {
            background: #0066cc;
        }
        
        body.light-mode .leaflet-popup-content-wrapper {
            background: #ffffff;
            color: #333;
        }
        
        body.light-mode .popup-title {
            color: #0066cc !important;
        }
        
        body.light-mode .section-title {
            color: #0066cc;
            border-bottom-color: #0066cc;
        }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 400px;
            grid-template-rows: 60px 1fr;
            height: 100vh;
        }
        
        header {
            grid-column: 1 / -1;
            padding: 15px 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: background-color 0.3s ease;
        }
        
        header h1 {
            font-size: 24px;
            color: #00d4ff;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: color 0.3s ease;
        }
        
        .logo {
            width: 40px;
            height: 40px;
            object-fit: contain;
        }
        
        .header-right {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .theme-toggle {
            background: transparent;
            border: 2px solid #00d4ff;
            color: #00d4ff;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }
        
        .theme-toggle:hover {
            background: #00d4ff;
            color: #1a1a2e;
        }
        
        body.light-mode .theme-toggle {
            border-color: #0066cc;
            color: #0066cc;
        }
        
        body.light-mode .theme-toggle:hover {
            background: #0066cc;
            color: #ffffff;
        }
        
        .nodes-status {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            border-radius: 8px;
            transition: background-color 0.3s ease;
        }
        
        .node-count {
            font-size: 18px;
            font-weight: bold;
            color: #00d4ff;
            transition: color 0.3s ease;
        }
        
        .node-list {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .node-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #00d4ff;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .node-badge:hover {
            opacity: 0.8;
            transform: scale(1.05);
        }
        
        .node-badge.hidden {
            display: none;
        }
        
        .node-badge.visible {
            display: flex;
        }
        
        .more-nodes {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            background: transparent;
            border: 1px solid #00d4ff;
            color: #00d4ff;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: bold;
        }
        
        .more-nodes:hover {
            background: #00d4ff;
            color: #1a1a2e;
        }
        
        body.light-mode .more-nodes {
            border-color: #0066cc;
            color: #0066cc;
        }
        
        body.light-mode .more-nodes:hover {
            background: #0066cc;
            color: #ffffff;
        }
        
        .node-battery {
            color: #00ff00;
            font-weight: bold;
            font-size: 11px;
        }
        
        .node-battery.low {
            color: #ff6b6b;
        }
        
        .node-battery.medium {
            color: #ffd93d;
        }
        
        .node-indicator {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #00ff00;
        }
        
        .status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }
        
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #00ff00;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        #map {
            width: 100%;
            height: 100%;
        }
        
        /* Dark mode map styling - vibrant with bright roads */
        body.dark-mode .map-tiles {
            filter: brightness(0.6) invert(1) contrast(3.5) hue-rotate(200deg) saturate(1.5) brightness(0.85);
        }
        
        .sidebar {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: background-color 0.3s ease;
        }
        
        .sidebar-header {
            padding: 15px 20px;
            font-size: 18px;
            font-weight: bold;
            border-bottom: 2px solid #00d4ff;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        .combined-content {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #00d4ff;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #00d4ff;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }
        
        .section-title:first-child {
            margin-top: 0;
        }
        
        .section-toggle {
            font-size: 12px;
            transition: transform 0.3s ease;
        }
        
        .section-toggle.collapsed {
            transform: rotate(-90deg);
        }
        
        .section-content {
            max-height: 10000px;
            overflow: hidden;
            transition: max-height 0.3s ease, opacity 0.3s ease;
            opacity: 1;
        }
        
        .section-content.collapsed {
            max-height: 0;
            opacity: 0;
        }
        
        .message-card {
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            border-left: 4px solid #00d4ff;
            animation: slideIn 0.3s ease;
            transition: background-color 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
            color: #aaa;
            transition: color 0.3s ease;
        }
        
        .message-from {
            font-weight: bold;
            color: #00d4ff;
            transition: color 0.3s ease;
        }
        
        .message-text {
            margin: 8px 0;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .message-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            font-size: 11px;
            color: #888;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #1a1a2e;
            transition: all 0.3s ease;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .location-entry {
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            border-left: 4px solid #4ecdc4;
            transition: background-color 0.3s ease;
            cursor: pointer;
        }
        
        .location-entry:hover {
            opacity: 0.8;
        }
        
        .location-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
            color: #aaa;
        }
        
        .location-node {
            font-weight: bold;
            color: #4ecdc4;
        }
        
        .location-coords {
            font-size: 13px;
            margin: 4px 0;
        }
        
        .location-meta {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            font-size: 11px;
            color: #888;
            margin-top: 8px;
        }
        
        .position-card {
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            border-left: 4px solid #ff6b6b;
            transition: background-color 0.3s ease;
        }
        
        .leaflet-popup-content-wrapper {
            transition: all 0.3s ease;
        }
        
        .leaflet-popup-content {
            margin: 10px;
        }
        
        .popup-title {
            font-weight: bold;
            color: #00d4ff;
            margin-bottom: 8px;
            font-size: 16px;
            transition: color 0.3s ease;
        }
        
        .popup-info {
            font-size: 12px;
            line-height: 1.6;
        }
        
        .popup-info div {
            margin: 4px 0;
        }
        
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            transition: background-color 0.3s ease;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #00d4ff;
            border-radius: 4px;
            transition: background-color 0.3s ease;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #00a8cc;
        }
    </style>
</head>
<body class="dark-mode">
    <div class="container">
        <header>
            <h1>
                <img src="meshtastic.png" alt="Meshtastic Logo" class="logo">
                <span>Meshtastic Monitor</span>
            </h1>
            <div class="header-right">
                <button class="theme-toggle" id="themeToggle">
                    <span id="themeIcon">☀️</span>
                    <span id="themeText">Light Mode</span>
                </button>
                <div class="nodes-status">
                    <div class="node-count">
                        <span id="nodeCount">0</span> Nodes
                    </div>
                    <div class="node-list" id="nodeList"></div>
                </div>
                <div class="status">
                    <div class="status-dot"></div>
                    <span>Connected</span>
                </div>
            </div>
        </header>
        
        <div id="map"></div>
        
        <div class="sidebar">
            <div class="sidebar-header">Activity Feed</div>
            <div class="combined-content">
                <div class="section-title" id="locationTitle">
                    <span>📍 Location Logs</span>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content" id="locationContent">
                    <div id="locations-section"></div>
                </div>
                <div class="section-title" id="messageTitle">
                    <span>💬 Messages</span>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content" id="messageContent">
                    <div id="messages-section"></div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="/socket.io/socket.io.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
    <script>
        const socket = io();
        
        // Theme toggle functionality
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');
        const body = document.body;
        
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('theme') || 'dark-mode';
        body.className = savedTheme;
        updateThemeButton();
        
        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('dark-mode')) {
                body.classList.remove('dark-mode');
                body.classList.add('light-mode');
                localStorage.setItem('theme', 'light-mode');
            } else {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark-mode');
            }
            updateThemeButton();
        });
        
        function updateThemeButton() {
            if (body.classList.contains('dark-mode')) {
                themeIcon.textContent = '☀️';
                themeText.textContent = 'Light Mode';
            } else {
                themeIcon.textContent = '🌙';
                themeText.textContent = 'Dark Mode';
            }
        }
        
        // Initialize map
        const map = L.map('map').setView([1.3521, 103.8198], 11);
        
        // Single tile layer with className for CSS filtering
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            className: 'map-tiles'
        }).addTo(map);
        
        const markers = new Map();
        const messagesContainer = document.getElementById('messages-section');
        const locationsContainer = document.getElementById('locations-section');
        const nodeListContainer = document.getElementById('nodeList');
        const nodeCountElement = document.getElementById('nodeCount');
        const onlineNodes = new Map();
        const locationHistory = [];
        
        const MAX_VISIBLE_NODES = 4;
        let showAllNodes = false;
        
        // Section toggle functionality
        const locationTitle = document.getElementById('locationTitle');
        const locationContent = document.getElementById('locationContent');
        const messageTitle = document.getElementById('messageTitle');
        const messageContent = document.getElementById('messageContent');
        
        locationTitle.addEventListener('click', () => {
            const toggle = locationTitle.querySelector('.section-toggle');
            locationContent.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        });
        
        messageTitle.addEventListener('click', () => {
            const toggle = messageTitle.querySelector('.section-toggle');
            messageContent.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        });
        
        const nodeColors = [
            '#00d4ff', '#ff6b6b', '#4ecdc4', '#ffd93d', '#a8e6cf',
            '#ff8b94', '#c7ceea', '#ffa07a', '#98d8c8', '#f7b731',
            '#5f27cd', '#00b894', '#fdcb6e', '#e84393', '#74b9ff'
        ];
        
        const nodeColorMap = new Map();
        let colorIndex = 0;
        
        function getNodeColor(nodeName) {
            if (!nodeColorMap.has(nodeName)) {
                nodeColorMap.set(nodeName, nodeColors[colorIndex % nodeColors.length]);
                colorIndex++;
            }
            return nodeColorMap.get(nodeName);
        }
        
        function updateNodeList() {
            nodeCountElement.textContent = onlineNodes.size;
            nodeListContainer.innerHTML = '';
            
            const nodeArray = Array.from(onlineNodes.entries());
            const visibleCount = showAllNodes ? nodeArray.length : Math.min(MAX_VISIBLE_NODES, nodeArray.length);
            const hasMoreNodes = nodeArray.length > MAX_VISIBLE_NODES;
            
            nodeArray.forEach(([nodeName, nodeData], index) => {
                const badge = document.createElement('div');
                badge.className = 'node-badge';
                const nodeColor = getNodeColor(nodeName);
                badge.style.borderColor = nodeColor;
                
                // Show first MAX_VISIBLE_NODES or all if expanded
                if (index >= visibleCount) {
                    badge.classList.add('hidden');
                } else {
                    badge.classList.add('visible');
                }
                
                let batteryClass = '';
                let batteryText = '';
                if (nodeData.battery && nodeData.battery !== 'N/A') {
                    batteryText = nodeData.battery;
                    const percentMatch = nodeData.battery.match(/(\d+)%/);
                    if (percentMatch) {
                        const percent = parseInt(percentMatch[1]);
                        if (percent <= 20) batteryClass = 'low';
                        else if (percent <= 50) batteryClass = 'medium';
                    }
                }
                
                badge.innerHTML = `
                    <div class="node-indicator" style="background: ${nodeColor};"></div>
                    <span>${nodeName}</span>
                    ${batteryText ? `<span class="node-battery ${batteryClass}">🔋 ${batteryText}</span>` : ''}
                `;
                
                // Add click handler to zoom to node location
                badge.addEventListener('click', () => {
                    if (markers.has(nodeName)) {
                        const marker = markers.get(nodeName);
                        const latLng = marker.getLatLng();
                        map.setView(latLng, 16);
                        marker.openPopup();
                    }
                });
                
                nodeListContainer.appendChild(badge);
            });
            
            // Add "..." button if there are more nodes
            if (hasMoreNodes && !showAllNodes) {
                const moreButton = document.createElement('button');
                moreButton.className = 'more-nodes';
                moreButton.textContent = '...';
                moreButton.addEventListener('click', () => {
                    showAllNodes = true;
                    updateNodeList();
                });
                nodeListContainer.appendChild(moreButton);
            } else if (hasMoreNodes && showAllNodes) {
                const lessButton = document.createElement('button');
                lessButton.className = 'more-nodes';
                lessButton.textContent = '−';
                lessButton.title = 'Show less';
                lessButton.addEventListener('click', () => {
                    showAllNodes = false;
                    updateNodeList();
                });
                nodeListContainer.appendChild(lessButton);
            }
        }
        
        function createNodeIcon(nodeName) {
            const color = getNodeColor(nodeName);
            return L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${color}80;"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
        }
        
        function addMessage(msg) {
            const messageEl = document.createElement('div');
            messageEl.className = 'message-card';
            const nodeColor = msg.from ? getNodeColor(msg.from) : '#00d4ff';
            messageEl.style.borderLeftColor = nodeColor;
            
            const time = new Date(msg.timestamp).toLocaleTimeString();
            
            if (msg.from) {
                onlineNodes.set(msg.from, { 
                    lastSeen: new Date(msg.timestamp),
                    battery: msg.battery
                });
                updateNodeList();
            }
            
            messageEl.innerHTML = `
                <div class="message-header">
                    <span class="message-from" style="color: ${nodeColor};">${msg.from || 'Unknown'}</span>
                    <span>${time}</span>
                </div>
                <div class="message-text">${msg.message || ''}</div>
                <div class="message-meta">
                    ${msg.rssi && msg.rssi !== 'N/A' ? `<div class="meta-item">📡 RSSI: ${msg.rssi} dBm</div>` : ''}
                    ${msg.snr && msg.snr !== 'N/A' ? `<div class="meta-item">📶 SNR: ${msg.snr} dB</div>` : ''}
                    ${msg.battery && msg.battery !== 'N/A' ? `<div class="meta-item">🔋 ${msg.battery}</div>` : ''}
                    ${msg.location ? `<div class="meta-item">📍 ${msg.location}</div>` : ''}
                </div>
            `;
            
            messagesContainer.insertBefore(messageEl, messagesContainer.firstChild);
            
            while (messagesContainer.children.length > 50) {
                messagesContainer.removeChild(messagesContainer.lastChild);
            }
        }
        
        function addLocationLog(pos) {
            locationHistory.unshift(pos);
            
            // Keep only last 100 location entries
            if (locationHistory.length > 100) {
                locationHistory.pop();
            }
            
            const locationEl = document.createElement('div');
            locationEl.className = 'location-entry';
            const nodeColor = getNodeColor(pos.from);
            locationEl.style.borderLeftColor = nodeColor;
            
            const time = new Date(pos.timestamp).toLocaleString();
            
            locationEl.innerHTML = `
                <div class="location-header">
                    <span class="location-node" style="color: ${nodeColor};">${pos.from || 'Unknown'}</span>
                    <span>${time}</span>
                </div>
                <div class="location-coords">📍 ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}</div>
                <div class="location-meta">
                    ${pos.altitude ? `<span>⛰️ ${pos.altitude}</span>` : ''}
                    ${pos.battery && pos.battery !== 'N/A' ? `<span>🔋 ${pos.battery}</span>` : ''}
                    ${pos.rssi && pos.rssi !== 'N/A' ? `<span>📡 ${pos.rssi} dBm</span>` : ''}
                    ${pos.snr && pos.snr !== 'N/A' ? `<span>📶 ${pos.snr} dB</span>` : ''}
                </div>
            `;
            
            // Click to zoom to location on map
            locationEl.addEventListener('click', () => {
                map.setView([pos.lat, pos.lng], 16);
                if (markers.has(pos.from)) {
                    markers.get(pos.from).openPopup();
                }
            });
            
            locationsContainer.insertBefore(locationEl, locationsContainer.firstChild);
            
            // Keep only 100 displayed entries
            while (locationsContainer.children.length > 100) {
                locationsContainer.removeChild(locationsContainer.lastChild);
            }
        }
        
        function updatePosition(pos) {
            if (pos.from) {
                onlineNodes.set(pos.from, { 
                    lastSeen: new Date(pos.timestamp),
                    battery: pos.battery
                });
                updateNodeList();
            }
            
            // Add to location log
            addLocationLog(pos);
            
            const nodeColor = getNodeColor(pos.from);
            
            const popupContent = `
                <div class="popup-title" style="color: ${nodeColor};">${pos.from || 'Unknown Node'}</div>
                <div class="popup-info">
                    <div>📍 ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}</div>
                    ${pos.altitude ? `<div>⛰️ Altitude: ${pos.altitude}</div>` : ''}
                    ${pos.battery && pos.battery !== 'N/A' ? `<div>🔋 Battery: ${pos.battery}</div>` : ''}
                    ${pos.rssi && pos.rssi !== 'N/A' ? `<div>📡 RSSI: ${pos.rssi} dBm</div>` : ''}
                    ${pos.snr && pos.snr !== 'N/A' ? `<div>📶 SNR: ${pos.snr} dB</div>` : ''}
                    <div>🕐 ${new Date(pos.timestamp).toLocaleString()}</div>
                </div>
            `;
            
            if (markers.has(pos.from)) {
                const marker = markers.get(pos.from);
                marker.setLatLng([pos.lat, pos.lng]);
                marker.setPopupContent(popupContent);
            } else {
                const marker = L.marker([pos.lat, pos.lng], { icon: createNodeIcon(pos.from) })
                    .addTo(map)
                    .bindPopup(popupContent);
                markers.set(pos.from, marker);
            }
            
            if (markers.size === 1) {
                map.setView([pos.lat, pos.lng], 13);
            }
        }
        
        socket.on('initial-data', (data) => {
            data.messages.forEach(msg => addMessage(msg));
            data.positions.forEach(pos => updatePosition(pos));
            
            if (markers.size > 0) {
                const bounds = L.latLngBounds(Array.from(markers.values()).map(m => m.getLatLng()));
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        });
        
        socket.on('new-message', (msg) => {
            addMessage(msg);
        });
        
        socket.on('position-update', (pos) => {
            updatePosition(pos);
        });
        
        socket.on('disconnect', () => {
            document.querySelector('.status-dot').style.background = '#ff0000';
            document.querySelector('.status span').textContent = 'Disconnected';
        });
        
        socket.on('connect', () => {
            document.querySelector('.status-dot').style.background = '#00ff00';
            document.querySelector('.status span').textContent = 'Connected';
        });
        
        socket.on('telemetry-update', (data) => {
            if (data.from && data.battery) {
                if (onlineNodes.has(data.from)) {
                    const nodeData = onlineNodes.get(data.from);
                    nodeData.battery = data.battery;
                    onlineNodes.set(data.from, nodeData);
                    updateNodeList();
                } else {
                    onlineNodes.set(data.from, {
                        lastSeen: new Date(data.timestamp),
                        battery: data.battery
                    });
                    updateNodeList();
                }
                
                if (markers.has(data.from)) {
                    const marker = markers.get(data.from);
                    const currentPopup = marker.getPopupContent();
                    const updatedPopup = currentPopup.replace(/🔋 Battery: [^<]+/, `🔋 Battery: ${data.battery}`);
                    marker.setPopupContent(updatedPopup);
                }
            }
        });
    </script>
</body>
</html>
