FROM node:18-slim

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy Node.js package files and install
COPY package*.json ./
RUN npm ci --only=production

# Copy all application files
COPY . .

# Expose port (Render uses PORT env variable)
EXPOSE 10000

# Start the server
CMD ["node", "server.js"]