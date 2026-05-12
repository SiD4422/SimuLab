# SimuLab — Docker image for Railway deployment
# Includes Node.js + avr-gcc for real Arduino compilation

FROM node:20-slim

# Install avr-gcc toolchain
RUN apt-get update && apt-get install -y \
    gcc-avr \
    avr-libc \
    binutils-avr \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Node dependencies first (cached layer)
COPY package.json ./
RUN npm install --production

# Copy all project files
COPY . .

# Expose port (Railway sets $PORT automatically)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health',r=>r.statusCode===200?process.exit(0):process.exit(1))"

# Start server
CMD ["node", "server.js"]
