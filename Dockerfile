# Development Dockerfile for Next.js
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Expose Next.js port
EXPOSE 3000

# Development command
CMD ["npm", "run", "dev"]
