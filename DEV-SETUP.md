# Development Setup Guide

This guide will help you set up the complete development environment for Kapture, including all required services for the downloads functionality.

## Prerequisites

### 1. Node.js and npm
- Node.js 18+ is required
- npm comes with Node.js

### 2. Redis (Required for downloads functionality)

#### Windows (using Chocolatey - Recommended)
```bash
# Install Chocolatey if you haven't already
# Run this in PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Redis
choco install redis-64
```

#### Windows (using WSL2 - Alternative)
```bash
# In WSL2 terminal
sudo apt update
sudo apt install redis-server
```

#### macOS
```bash
# Using Homebrew
brew install redis
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server
```

### 3. yt-dlp (Required for media downloads)

#### Windows
```bash
# Using winget
winget install yt-dlp.yt-dlp

# Or using Chocolatey
choco install yt-dlp

# Or using pip
pip install yt-dlp
```

#### macOS
```bash
# Using Homebrew
brew install yt-dlp

# Or using pip
pip install yt-dlp
```

#### Linux
```bash
# Using pip
pip install yt-dlp

# Or download binary
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

## Quick Start

### Option 1: Manual Setup (Recommended for development)

1. **Start Redis** (in one terminal):
   ```bash
   # Windows
   redis-server

   # WSL2/Linux/macOS
   redis-server
   ```

2. **Start yt-dlp service** (in another terminal):
   ```bash
   cd yt-dlp-service
   npm start
   ```

3. **Start Next.js app** (in a third terminal):
   ```bash
   npm run dev
   ```

### Option 2: Automated Setup (All services at once)

```bash
# Install yt-dlp service dependencies (one time)
npm run ytdlp:install

# Start all services
npm run dev:full
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start only the Next.js development server |
| `npm run dev:full` | Start Redis, yt-dlp service, and Next.js app |
| `npm run ytdlp:install` | Install dependencies for the yt-dlp service |
| `npm run redis:start` | Start Redis server |
| `npm run ytdlp:start` | Start yt-dlp service |

## Verification

### Check if Redis is running:
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

### Check if yt-dlp service is running:
```bash
# Test yt-dlp service
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Check if Next.js is running:
Open your browser to: http://localhost:3000

## Troubleshooting

### Redis Issues

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:6379`
**Solution**: Redis is not running. Start Redis with `redis-server`

**Problem**: `redis-server` command not found
**Solution**: Redis is not installed. Follow the installation instructions above.

### yt-dlp Service Issues

**Problem**: Download requests fail with 500 error
**Solution**: 
1. Check if yt-dlp service is running on port 3001
2. Verify yt-dlp binary is installed: `yt-dlp --version`

**Problem**: `yt-dlp` command not found
**Solution**: Install yt-dlp following the instructions above.

### Port Conflicts

- **Next.js**: Port 3000
- **yt-dlp service**: Port 3001  
- **Redis**: Port 6379

If you have port conflicts, you can modify the ports in:
- `yt-dlp-service/server.js` (for yt-dlp service port)
- `next.config.js` (for Next.js port)
- Redis configuration (for Redis port)

## Environment Variables

Make sure you have a `.env.local` file with the required environment variables. Copy from `.env.local.template`:

```bash
cp .env.local.template .env.local
```

Key variables for downloads:
- `YTDLP_SERVICE_URL=http://localhost:3001`
- `REDIS_URL=redis://localhost:6379`

## Downloads Functionality

Once all services are running:

1. Go to http://localhost:3000/downloads
2. Paste a YouTube, TikTok, or Instagram URL
3. Click "Download"
4. Watch the download progress in real-time
5. View your download history

The downloads system now includes:
- ✅ Real API integration (no more mock data)
- ✅ React Query for data fetching and caching  
- ✅ Real-time progress updates
- ✅ File lifecycle management
- ✅ Proper error handling and loading states
- ✅ Toast notifications
- ✅ Retry functionality
- ✅ Bulk operations

## Need Help?

If you encounter any issues:

1. Check that all prerequisites are installed
2. Verify all services are running
3. Check the browser console for any errors
4. Check the terminal output for service errors
5. Restart all services if needed

For additional help, check the main README.md or create an issue in the repository.