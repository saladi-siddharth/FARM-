# Use Node.js 20 (LTS) for full compatibility with sqlite3 and modern packages
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install native compilation dependencies for sqlite3 / bcrypt
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 5000

# Set environment variable for production
ENV NODE_ENV=production

# Command to start the application
CMD ["npm", "start"]
