FROM node:20-bullseye-slim

# Install C++ compilers for AVR (Arduino) and curl
RUN apt-get update && \
    apt-get install -y curl gcc-avr binutils-avr avr-libc && \
    rm -rf /var/lib/apt/lists/*

# Install arduino-cli as a fallback compiler and install the core AVR libraries
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh && \
    arduino-cli core update-index && \
    arduino-cli core install arduino:avr

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY . .

# Ensure the persistent data directory exists
RUN mkdir -p /app/data

# Environment variables
ENV PORT=3080
ENV NODE_ENV=production

EXPOSE 3080

CMD [ "npm", "start" ]
