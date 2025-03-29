# Use official Node LTS base image
FROM node:18-slim

# Install dependencies: ClamAV, qpdf, poppler-utils
RUN apt-get update && \
    apt-get install -y \
    clamav \
    clamav-daemon \
    qpdf \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Update ClamAV virus definitions
RUN freshclam || true

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all app files
COPY . .

# Expose your app port (adjust if needed)
EXPOSE 5003

# Run your app
CMD ["npm", "start"]
