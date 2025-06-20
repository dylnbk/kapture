# yt-dlp Service

A standalone Node.js/Express service that provides a REST API for video and audio downloads using yt-dlp. This service is designed to work alongside the Next.js Kapture application and provides all the endpoints that the existing media service expects.

## Features

- **Download Support**: Download videos and audio from 1000+ supported sites
- **Metadata Extraction**: Extract video/audio metadata without downloading
- **Progress Tracking**: Real-time download progress monitoring
- **Job Management**: Start, monitor, and cancel download jobs
- **Multiple Formats**: Support for various video and audio quality options
- **Concurrent Downloads**: Handle multiple downloads simultaneously
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Rate Limiting**: Built-in rate limiting for API protection
- **Health Checks**: Health monitoring endpoints

## API Endpoints

### POST /download
Start a new download job.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "format": "best[height<=1080][ext=mp4]/best[height<=1080]",
  "extract_info": true,
  "userId": "user-123"
}
```

**Response:**
```json
{
  "id": "uuid-job-id",
  "status": "pending",
  "progress": 0,
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### GET /download/:id/status
Check the status of a download job.

**Response:**
```json
{
  "id": "uuid-job-id",
  "status": "completed",
  "progress": 100,
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "userId": "user-123",
  "fileType": "video",
  "quality": "high",
  "metadata": {
    "title": "Rick Astley - Never Gonna Give You Up",
    "description": "Official music video...",
    "duration": 213,
    "thumbnail": "https://...",
    "uploader": "Rick Astley",
    "uploadDate": "20091002",
    "viewCount": 1000000000,
    "likeCount": 10000000,
    "fileSize": 52428800,
    "format": "mp4",
    "resolution": "1080p"
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:05:00.000Z"
}
```

### POST /download/:id/cancel
Cancel a running download job.

**Response:**
```json
{
  "success": true,
  "message": "Download cancelled"
}
```

### POST /extract
Extract metadata from a URL without downloading.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "description": "Official music video...",
  "duration": 213,
  "thumbnail": "https://...",
  "uploader": "Rick Astley",
  "upload_date": "20091002",
  "view_count": 1000000000,
  "like_count": 10000000,
  "filesize": 52428800,
  "format": "mp4",
  "resolution": "1080p",
  "formats": [
    {
      "format_id": "18",
      "ext": "mp4",
      "quality": "medium",
      "filesize": 25214400
    }
  ]
}
```

### GET /extractors
Get list of supported extractors/sites.

**Response:**
```json
{
  "extractors": [
    "youtube",
    "tiktok",
    "instagram",
    "twitter",
    "facebook",
    "vimeo",
    "..."
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "activeJobs": 3,
  "activeProcesses": 2
}
```

## Installation

### Prerequisites

- Node.js 18+ 
- Python 3.6+
- yt-dlp binary installed
- ffmpeg (for audio conversion)

### Local Development

1. **Clone or create the service directory:**
   ```bash
   mkdir yt-dlp-service
   cd yt-dlp-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install yt-dlp:**
   ```bash
   # Using pip
   pip install yt-dlp
   
   # Or using npm (alternative)
   npm install -g yt-dlp
   
   # Or download binary directly
   curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
   chmod a+rx /usr/local/bin/yt-dlp
   ```

4. **Install ffmpeg (required for audio conversion):**
   ```bash
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # macOS
   brew install ffmpeg
   
   # Windows (using chocolatey)
   choco install ffmpeg
   ```

5. **Start the service:**
   ```bash
   npm start
   
   # Or for development with auto-reload
   npm run dev
   ```

6. **Test the service:**
   ```bash
   curl http://localhost:3001/health
   ```

### Docker Deployment

1. **Build and run with Docker Compose (recommended):**
   ```bash
   docker-compose up -d
   ```

2. **Or build and run with Docker:**
   ```bash
   docker build -t yt-dlp-service .
   docker run -d -p 3001:3001 -v ./downloads:/app/downloads yt-dlp-service
   ```

3. **Check logs:**
   ```bash
   docker-compose logs -f yt-dlp-service
   ```

4. **Stop the service:**
   ```bash
   docker-compose down
   ```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port to run the service on |
| `DOWNLOAD_DIR` | `./downloads` | Directory to store downloaded files |
| `YTDLP_BINARY` | `yt-dlp` | Path to yt-dlp binary |
| `NODE_ENV` | `development` | Node environment |

### Example .env file

```env
PORT=3001
DOWNLOAD_DIR=./downloads
YTDLP_BINARY=yt-dlp
NODE_ENV=production
```

## Integration with Kapture

To use this service with the existing Kapture application, update your environment variables:

```env
# In your main Kapture application .env file
YTDLP_SERVICE_URL=http://localhost:3001
```

The existing [`media-service.ts`](../src/services/media-service.ts) will automatically connect to this service.

## Format Strings

The service supports yt-dlp format strings for quality selection:

### Video Formats
- **Highest**: `best[ext=mp4]/best`
- **High**: `best[height<=1080][ext=mp4]/best[height<=1080]`
- **Medium**: `best[height<=720][ext=mp4]/best[height<=720]`
- **Low**: `best[height<=480][ext=mp4]/best[height<=480]`

### Audio Formats
- **Highest**: `bestaudio[ext=mp3]/bestaudio`
- **High**: `bestaudio[abr<=320][ext=mp3]/bestaudio[abr<=320]`
- **Medium**: `bestaudio[abr<=192][ext=mp3]/bestaudio[abr<=192]`
- **Low**: `bestaudio[abr<=128][ext=mp3]/bestaudio[abr<=128]`

## Monitoring

### Health Checks

The service provides health check endpoints for monitoring:

- **HTTP Health Check**: `GET /health`
- **Docker Health Check**: Built into Docker container
- **Process Monitoring**: Tracks active downloads and jobs

### Logging

The service uses Morgan for HTTP request logging. Logs include:
- HTTP requests and responses
- Download progress updates
- Error messages
- Process lifecycle events

### Metrics

Available through the `/health` endpoint:
- Active job count
- Active process count
- Service uptime
- Memory usage (via Docker)

## Troubleshooting

### Common Issues

1. **yt-dlp not found**
   ```
   Error: spawn yt-dlp ENOENT
   ```
   **Solution**: Install yt-dlp and ensure it's in your PATH.

2. **Permission denied errors**
   ```
   Error: EACCES: permission denied
   ```
   **Solution**: Check download directory permissions or run with appropriate user.

3. **Memory issues with large downloads**
   **Solution**: Adjust Docker memory limits or system resources.

4. **Network timeout errors**
   **Solution**: Check internet connection and firewall settings.

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

### Checking yt-dlp Installation

```bash
# Test yt-dlp directly
yt-dlp --version

# Test with a simple video
yt-dlp --dump-json "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## Performance Considerations

- **Concurrent Downloads**: The service handles multiple downloads but consider system resources
- **Disk Space**: Monitor download directory disk usage
- **Memory Usage**: Large downloads may require more memory
- **Network Bandwidth**: Downloads will consume network bandwidth

## Security

- Rate limiting is enabled by default (100 requests per 15 minutes per IP)
- Non-root user in Docker container
- Input validation on all endpoints
- Helmet.js security headers
- CORS enabled for cross-origin requests

## Support

This service supports 1000+ websites through yt-dlp, including:
- YouTube
- TikTok
- Instagram
- Twitter/X
- Facebook
- Vimeo
- Reddit
- Twitch
- SoundCloud
- And many more...

## License

MIT License - see the main project license for details.