FROM node:18-alpine

# Install Python, pip, and other dependencies needed for yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    && ln -sf python3 /usr/bin/python

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY server.js ./

# Create downloads directory
RUN mkdir -p /app/downloads

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ytdlp -u 1001 && \
    chown -R ytdlp:nodejs /app

# Switch to non-root user
USER ytdlp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Environment variables
ENV PORT=3001
ENV DOWNLOAD_DIR=/app/downloads
ENV YTDLP_BINARY=yt-dlp
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]