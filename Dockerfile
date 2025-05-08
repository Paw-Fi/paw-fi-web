FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Ensure the TypeScript server file is compiled
RUN npx tsc server.ts --outDir dist --esModuleInterop --moduleResolution node16

# Set production environment
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Run the server
CMD ["node", "dist/server.js"]
