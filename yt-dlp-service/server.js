const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Enhanced helper function to clean filenames for filesystem safety
function cleanFilename(filename) {
  if (!filename) return 'media';
  
  return filename
    // Remove emojis and unicode symbols (more comprehensive)
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '')
    // Remove other problematic Unicode characters
    .replace(/[\u{0000}-\u{001F}\u{007F}-\u{009F}]/gu, '') // Control characters
    .replace(/[\u{2000}-\u{206F}]/gu, '') // General punctuation
    .replace(/[\u{FFF0}-\u{FFFF}]/gu, '') // Specials
    // Replace filesystem-unsafe characters with safe alternatives
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Additional control characters
    // Clean up parentheses and brackets that might cause issues
    .replace(/[()[\]{}]/g, '-')
    // Replace multiple spaces/dashes with single dash
    .replace(/[-\s]+/g, '-')
    // Remove quotes and other problematic punctuation
    .replace(/['"´`]/g, '')
    // Remove leading/trailing dashes, spaces, and dots
    .trim()
    .replace(/^[-.\s]+|[-.\s]+$/g, '')
    // Limit length to 180 characters (leaving room for extension)
    .substring(0, 180)
    // Ensure it's not empty and doesn't end with dot
    .replace(/\.$/, '') || 'media';
}

// Helper function to get clean filename with extension
function getCleanFilenameWithExt(title, originalExt) {
  const cleanTitle = cleanFilename(title);
  const ext = originalExt.startsWith('.') ? originalExt : `.${originalExt}`;
  return `${cleanTitle}${ext}`;
}

const app = express();
const PORT = process.env.PORT || 3001;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
const YTDLP_BINARY = process.env.YTDLP_BINARY || 'yt-dlp';

// In-memory storage for jobs and progress
const jobs = new Map();
const activeProcesses = new Map();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Ensure download directory exists
async function ensureDownloadDir() {
  try {
    await fs.access(DOWNLOAD_DIR);
  } catch (error) {
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
  }
}

// Helper function to execute yt-dlp commands
function executeYtDlp(args, onProgress, onComplete, onError) {
  const process = spawn(YTDLP_BINARY, args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  process.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    
    // Parse progress from yt-dlp output
    const progressMatch = text.match(/(\d+\.?\d*)%/);
    if (progressMatch && onProgress) {
      const progress = parseFloat(progressMatch[1]);
      onProgress(progress);
    }
  });

  process.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  process.on('close', (code) => {
    if (code === 0) {
      onComplete(output);
    } else {
      onError(errorOutput || `Process exited with code ${code}`);
    }
  });

  process.on('error', (error) => {
    onError(error.message);
  });

  return process;
}

// Helper function to parse yt-dlp JSON output
function parseYtDlpOutput(output) {
  try {
    // yt-dlp outputs one JSON object per line for playlists
    const lines = output.trim().split('\n').filter(line => line.trim());
    const lastLine = lines[lines.length - 1];
    return JSON.parse(lastLine);
  } catch (error) {
    console.error('Failed to parse yt-dlp output:', error);
    return null;
  }
}

// POST /download - Start a download
app.post('/download', async (req, res) => {
  try {
    const { url, format, extract_info, userId } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    const jobId = uuidv4();
    const outputPath = path.join(DOWNLOAD_DIR, jobId);
    
    await fs.mkdir(outputPath, { recursive: true });

    const job = {
      id: jobId,
      status: 'pending',
      progress: 0,
      url,
      userId,
      format: format || 'bv*',
      outputPath,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null,
      error: null
    };

    jobs.set(jobId, job);

    // Start download process - download HIGHEST quality available
    // First extract metadata to get title for clean filename
    const extractArgs = [
      url,
      '--dump-json',
      '--no-download',
      '--no-playlist'
    ];

    console.log('Extracting metadata for clean filename...');
    let cleanedFilename = jobId; // Fallback to jobId
    
    try {
      // Extract metadata synchronously to get clean filename
      const { spawn: syncSpawn } = require('child_process');
      const extractProcess = syncSpawn(YTDLP_BINARY, extractArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      let extractOutput = '';
      
      extractProcess.stdout.on('data', (data) => {
        extractOutput += data.toString();
      });
      
      await new Promise((resolve, reject) => {
        extractProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const metadata = parseYtDlpOutput(extractOutput);
              if (metadata && metadata.title) {
                cleanedFilename = cleanFilename(metadata.title);
                console.log(`Using cleaned filename: ${cleanedFilename}`);
              }
            } catch (parseError) {
              console.warn('Failed to parse metadata for filename, using jobId');
            }
          }
          resolve();
        });
        
        extractProcess.on('error', () => {
          console.warn('Metadata extraction failed, using jobId as filename');
          resolve();
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          extractProcess.kill();
          resolve();
        }, 10000);
      });
    } catch (metaError) {
      console.warn('Metadata extraction error, using jobId:', metaError);
    }

    const args = [
      url,
      '--format', format || 'bv*',  // Download best video quality (best quality format that contains video)
      '--output', path.join(outputPath, `${cleanedFilename}.%(ext)s`), // Use cleaned filename
      '--newline',
      '--no-playlist',
      '--write-info-json'  // Always extract metadata for title
    ];

    console.log('yt-dlp command:', YTDLP_BINARY, args.join(' '));

    const process = executeYtDlp(
      args,
      (progress) => {
        const currentJob = jobs.get(jobId);
        if (currentJob) {
          currentJob.progress = Math.min(progress, 100);
          currentJob.status = 'processing';
          currentJob.updatedAt = new Date();
          jobs.set(jobId, currentJob);
        }
      },
      async (output) => {
        const currentJob = jobs.get(jobId);
        if (currentJob) {
          // Verify that media files actually exist before marking as completed
          try {
            const files = await fs.readdir(outputPath);
            console.log('DEBUG - Download completion analysis:', {
              jobId,
              expectedPattern: `${jobId}.*`,
              actualFiles: files,
              outputPath: outputPath
            });
            
            // Look for media files (not just .info.json)
            const mediaFiles = files.filter(f =>
              !f.endsWith('.info.json') &&
              !f.endsWith('.mhtml') &&
              (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv') ||
               f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.ogg'))
            );
            
            if (mediaFiles.length === 0) {
              console.error('No media files found after download completion:', files);
              currentJob.status = 'failed';
              currentJob.error = 'No media files downloaded';
              currentJob.updatedAt = new Date();
              jobs.set(jobId, currentJob);
              activeProcesses.delete(jobId);
              return;
            }
            
            // Verify the main media file exists and is accessible
            const mediaFile = mediaFiles[0];
            const mediaFilePath = path.join(outputPath, mediaFile);
            
            try {
              const stats = await fs.stat(mediaFilePath);
              console.log(`Media file verified: ${mediaFile}, size: ${stats.size} bytes`);
              
              // Only mark as completed if file exists and has content
              if (stats.size === 0) {
                console.error('Media file is empty:', mediaFile);
                currentJob.status = 'failed';
                currentJob.error = 'Downloaded file is empty';
                currentJob.updatedAt = new Date();
                jobs.set(jobId, currentJob);
                activeProcesses.delete(jobId);
                return;
              }
              
            } catch (fileError) {
              console.error('Media file verification failed:', fileError);
              currentJob.status = 'failed';
              currentJob.error = 'Media file not accessible';
              currentJob.updatedAt = new Date();
              jobs.set(jobId, currentJob);
              activeProcesses.delete(jobId);
              return;
            }

            // Now mark as completed since we verified the file exists
            currentJob.status = 'completed';
            currentJob.progress = 100;
            currentJob.updatedAt = new Date();

            // Try to read metadata from info.json if it exists
            const infoFile = files.find(f => f.endsWith('.info.json'));
            if (infoFile) {
              try {
                const infoContent = await fs.readFile(path.join(outputPath, infoFile), 'utf-8');
                const metadata = JSON.parse(infoContent);
                currentJob.metadata = {
                  title: metadata.title,
                  description: metadata.description,
                  duration: metadata.duration,
                  thumbnail: metadata.thumbnail,
                  uploader: metadata.uploader || metadata.channel,
                  uploadDate: metadata.upload_date,
                  viewCount: metadata.view_count,
                  likeCount: metadata.like_count,
                  fileSize: metadata.filesize || metadata.filesize_approx,
                  format: metadata.format,
                  resolution: metadata.resolution
                };
              } catch (metadataError) {
                console.error('Failed to read metadata:', metadataError);
              }
            }

            console.log(`Job ${jobId} marked as completed with verified media file: ${mediaFile}`);
            jobs.set(jobId, currentJob);
            activeProcesses.delete(jobId);
            
          } catch (dirError) {
            console.error('Failed to read download directory:', dirError);
            currentJob.status = 'failed';
            currentJob.error = 'Failed to access download directory';
            currentJob.updatedAt = new Date();
            jobs.set(jobId, currentJob);
            activeProcesses.delete(jobId);
          }
        }
      },
      (error) => {
        const currentJob = jobs.get(jobId);
        if (currentJob) {
          currentJob.status = 'failed';
          currentJob.error = error;
          currentJob.updatedAt = new Date();
          jobs.set(jobId, currentJob);
          activeProcesses.delete(jobId);
        }
      }
    );

    activeProcesses.set(jobId, process);

    res.json({
      id: jobId,
      status: 'pending',
      progress: 0,
      url,
      createdAt: job.createdAt
    });

  } catch (error) {
    console.error('Download request error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /download/:id/status - Check download status
app.get('/download/:id/status', (req, res) => {
  const { id } = req.params;
  const job = jobs.get(id);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found'
    });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    url: job.url,
    userId: job.userId,
    fileType: job.format.includes('audio') ? 'audio' : 'video',
    quality: 'high', // Simplified for now
    metadata: job.metadata,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  });
});

// POST /download/:id/cancel - Cancel a download
app.post('/download/:id/cancel', (req, res) => {
  const { id } = req.params;
  const job = jobs.get(id);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found'
    });
  }

  const process = activeProcesses.get(id);
  if (process) {
    process.kill('SIGTERM');
    activeProcesses.delete(id);
  }

  job.status = 'failed';
  job.error = 'Cancelled by user';
  job.updatedAt = new Date();
  jobs.set(id, job);

  res.json({
    success: true,
    message: 'Download cancelled'
  });
});

// POST /extract - Extract metadata without downloading
app.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    const args = [
      url,
      '--dump-json',
      '--no-download',
      '--no-playlist'
    ];

    const process = executeYtDlp(
      args,
      null, // no progress callback
      (output) => {
        const metadata = parseYtDlpOutput(output);
        if (metadata) {
          res.json({
            title: metadata.title,
            description: metadata.description,
            duration: metadata.duration,
            thumbnail: metadata.thumbnail,
            uploader: metadata.uploader || metadata.channel,
            upload_date: metadata.upload_date,
            view_count: metadata.view_count,
            like_count: metadata.like_count,
            filesize: metadata.filesize || metadata.filesize_approx,
            format: metadata.format,
            resolution: metadata.resolution,
            formats: metadata.formats ? metadata.formats.map(f => ({
              format_id: f.format_id,
              ext: f.ext,
              quality: f.quality,
              filesize: f.filesize
            })) : []
          });
        } else {
          res.status(500).json({
            error: 'Failed to parse metadata'
          });
        }
      },
      (error) => {
        console.error('Metadata extraction error:', error);
        res.status(500).json({
          error: 'Failed to extract metadata: ' + error
        });
      }
    );

  } catch (error) {
    console.error('Extract request error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /extractors - Get available extractors
app.get('/extractors', async (req, res) => {
  try {
    const args = ['--list-extractors'];

    const process = executeYtDlp(
      args,
      null, // no progress callback
      (output) => {
        const extractors = output
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('['))
          .slice(0, 100); // Limit to first 100 for performance

        res.json({
          extractors: extractors
        });
      },
      (error) => {
        console.error('Extractors list error:', error);
        // Return common extractors as fallback
        res.json({
          extractors: [
            'youtube',
            'tiktok',
            'instagram',
            'twitter',
            'facebook',
            'vimeo',
            'reddit',
            'twitch',
            'soundcloud',
            'spotify'
          ]
        });
      }
    );

  } catch (error) {
    console.error('Extractors request error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Helper function to find media files with fallback logic
async function findMediaFiles(outputPath, jobId) {
  const files = await fs.readdir(outputPath);
  
  // Filter for media files (not .info.json, .mhtml, .description)
  const mediaFiles = files.filter(file =>
    !file.endsWith('.info.json') &&
    !file.endsWith('.mhtml') &&
    !file.endsWith('.description') &&
    (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv') ||
     file.endsWith('.mp3') || file.endsWith('.m4a') || file.endsWith('.ogg') ||
     file.endsWith('.wav') || file.endsWith('.flac'))
  );
  
  return mediaFiles;
}

// GET /download/:id/files - List available files for a job
app.get('/download/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const outputPath = path.join(DOWNLOAD_DIR, id);
    
    try {
      const files = await fs.readdir(outputPath);
      const job = jobs.get(id);
      
      const fileList = await Promise.all(files.map(async (file) => {
        const filePath = path.join(outputPath, file);
        const stats = await fs.stat(filePath);
        
        // Get display name - prioritize cleaned original title
        let displayName = file;
        if (job && job.metadata && job.metadata.title && !file.endsWith('.info.json')) {
          const ext = path.extname(file);
          displayName = getCleanFilenameWithExt(job.metadata.title, ext);
        } else if (!file.startsWith(id)) {
          // For legacy files, clean the existing filename
          const baseName = path.basename(file, path.extname(file));
          const ext = path.extname(file);
          displayName = getCleanFilenameWithExt(baseName, ext);
        }
        
        return {
          name: file, // actual filename on disk
          displayName: displayName, // cleaned name to show to user
          size: stats.size,
          isVideo: !file.endsWith('.info.json') && !file.endsWith('.mhtml') && !file.endsWith('.description'),
          downloadUrl: `/download/${id}/file/${encodeURIComponent(file)}`
        };
      }));
      
      // Return all media files (video/audio)
      const mediaFiles = fileList.filter(f => f.isVideo);
      
      res.json({
        files: mediaFiles,
        jobId: id,
        total: mediaFiles.length,
        allFiles: fileList.map(f => f.name) // Debug info
      });
    } catch (error) {
      res.status(404).json({
        error: 'No files found for this job'
      });
    }
  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /download/:id/file/:filename - Download a specific file with fallback logic
app.get('/download/:id/file/:filename', async (req, res) => {
  try {
    const { id, filename } = req.params;
    
    // Decode the filename properly to handle Unicode characters
    let decodedFilename;
    try {
      decodedFilename = decodeURIComponent(filename);
    } catch (decodeError) {
      console.error('Failed to decode filename:', filename, decodeError);
      return res.status(400).end('Invalid filename encoding');
    }
    
    const outputPath = path.join(DOWNLOAD_DIR, id);
    let actualFilePath = path.join(outputPath, decodedFilename);
    
    console.log('DEBUG - File serving analysis:', {
      id,
      originalFilename: filename,
      decodedFilename,
      expectedPath: actualFilePath
    });
    
    // Try to find the file - handle both direct match and fallback scenarios
    let foundFile = null;
    let foundFilePath = null;
    
    try {
      const allFiles = await fs.readdir(outputPath);
      console.log('DEBUG - All files in directory:', allFiles);
      
      // First try: exact filename match
      if (allFiles.includes(decodedFilename)) {
        foundFile = decodedFilename;
        foundFilePath = actualFilePath;
      } else {
        // Second try: find any media file (fallback for legacy files)
        const mediaFiles = await findMediaFiles(outputPath, id);
        if (mediaFiles.length > 0) {
          foundFile = mediaFiles[0]; // Use first media file found
          foundFilePath = path.join(outputPath, foundFile);
          console.log('DEBUG - Using fallback file:', foundFile);
        }
      }
      
      if (!foundFile) {
        console.error('No suitable file found in directory');
        return res.status(404).end('File not found');
      }
      
    } catch (dirError) {
      console.error('DEBUG - Could not read directory:', dirError);
      return res.status(404).end('Directory not found');
    }
    
    try {
      // Verify the found file exists and get stats
      const stats = await fs.stat(foundFilePath);
      
      if (stats.size === 0) {
        console.error('File is empty:', foundFilePath);
        return res.status(404).end('File is empty');
      }
      
      // Get job metadata for clean display name
      const job = jobs.get(id);
      let displayName = foundFile;
      
      if (job && job.metadata && job.metadata.title) {
        // Use clean title from metadata
        const ext = path.extname(foundFile);
        displayName = getCleanFilenameWithExt(job.metadata.title, ext);
      } else {
        // Clean the existing filename for safety
        const baseName = path.basename(foundFile, path.extname(foundFile));
        const ext = path.extname(foundFile);
        displayName = getCleanFilenameWithExt(baseName, ext);
      }
      
      console.log('DEBUG - Serving file:', {
        actualFile: foundFile,
        displayName: displayName,
        size: stats.size
      });
      
      // Set appropriate headers for file download with proper encoding
      const encodedDisplayName = encodeURIComponent(displayName);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedDisplayName}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);
      
      // Stream the file
      const fileStream = require('fs').createReadStream(foundFilePath);
      
      fileStream.on('error', (streamError) => {
        console.error('File stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).end('File streaming error');
        } else {
          res.end();
        }
      });
      
      res.on('error', (resError) => {
        console.error('Response error:', resError);
        fileStream.destroy();
      });
      
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('File access error:', {
        foundFilePath,
        error: error.message
      });
      res.status(404).end('File not found');
    }
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).end('Internal server error');
  }
});

// GET /health - Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeJobs: jobs.size,
    activeProcesses: activeProcesses.size
  });
});

// GET /jobs - List all jobs (for debugging)
app.get('/jobs', (req, res) => {
  const jobList = Array.from(jobs.values()).map(job => ({
    id: job.id,
    status: job.status,
    progress: job.progress,
    url: job.url,
    createdAt: job.createdAt,
    error: job.error
  }));

  res.json({
    jobs: jobList,
    total: jobList.length
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Cleanup function for graceful shutdown
function cleanup() {
  console.log('Shutting down gracefully...');
  
  // Kill all active processes
  for (const [jobId, process] of activeProcesses) {
    console.log(`Killing process for job ${jobId}`);
    process.kill('SIGTERM');
  }
  
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start server
async function startServer() {
  try {
    await ensureDownloadDir();
    
    app.listen(PORT, () => {
      console.log(`yt-dlp service running on port ${PORT}`);
      console.log(`Download directory: ${DOWNLOAD_DIR}`);
      console.log(`Using yt-dlp binary: ${YTDLP_BINARY}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();