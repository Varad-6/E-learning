FROM node:20-slim

WORKDIR /app

# Copy package.json and package-lock.json first for caching
COPY package.json package-lock.json* ./

# Install npm dependencies
RUN npm install

# Copy application files
COPY . .

# Expose the Vite development port
EXPOSE 5173

# Run development server with host option to accept external connections
CMD ["npm", "run", "dev", "--", "--host"]
