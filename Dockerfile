# Use Node.js 18 (LTS) for stability and compatibility
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies (only production dependencies are needed for running the app, but dev dependencies might be needed for build scripts if any exist)
# Using 'npm ci' for a clean, reproducible install from package-lock.json
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the application port (defaults to 3000 in your code)
EXPOSE 3000

# Set environment variable for production (optional but good practice)
ENV NODE_ENV=production

# Command to start the application
CMD ["npm", "start"]
