# Use Node.js as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY src/ ./src/

# Create data directory for SQLite database
RUN mkdir -p data

# Build frontend
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Return to app directory
WORKDIR /app

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]