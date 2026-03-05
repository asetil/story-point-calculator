# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Copy app source
COPY server.js .
COPY index.html .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
