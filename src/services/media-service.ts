import { DevCircuitBreaker, cache, CACHE_KEYS, CACHE_TTL } from '../lib/redis-dev';
import { cleanupService } from './cleanup-service';
import { db } from '@/lib/db';

export interface DownloadRequest {
  url: string;
  userId: string;
  fileType?: 'video' | 'audio' | 'image';
  quality?: 'highest' | 'high' | 'medium' | 'low';
  trendId?: string;
}

export interface DownloadJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  url: string;
  userId: string;
  fileType: string;
  quality: string;
  metadata?: DownloadMetadata;
  detailedProgress?: {
    percentage: number;
    speed?: string;
    eta?: string;
    downloadedBytes?: number;
    totalBytes?: number;
    totalSize?: string;
    currentPhase?: string;
    phases?: Array<{
      name: string;
      status: 'pending' | 'active' | 'completed' | 'failed';
      progress?: number;
      message?: string;
      startTime?: string;
      endTime?: string;
    }>;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DownloadMetadata {
  title?: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  uploadDate?: string;
  viewCount?: number;
  likeCount?: number;
  fileSize?: number;
  format?: string;
  resolution?: string;
}

export interface DownloadResult {
  jobId: string;
  storageKey: string;
  storageUrl: string;
  fileSize: number;
  duration?: number;
  metadata: DownloadMetadata;
}

class MediaService {
  private ytdlpBaseUrl: string;
  private circuitBreaker: DevCircuitBreaker;

  constructor() {
    this.ytdlpBaseUrl = process.env.YTDLP_SERVICE_URL || 'http://localhost:3001';
    this.circuitBreaker = new DevCircuitBreaker(5, 60000);
  }

  private async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }

  async requestDownload(request: DownloadRequest): Promise<DownloadJob> {
    try {
      const response = await fetch(`${this.ytdlpBaseUrl}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: request.url,
          format: this.getFormatString(request.fileType, request.quality),
          extract_info: true,
          userId: request.userId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const job = await response.json();
      
      // Try to cache the job status, but don't fail if cache is unavailable
      try {
        await cache.set(
          CACHE_KEYS.DOWNLOAD_STATUS(job.id),
          job,
          CACHE_TTL.DOWNLOAD_STATUS
        );
      } catch (cacheError) {
        console.warn('Cache unavailable, continuing without cache:', cacheError);
      }

      return {
        id: job.id,
        status: 'pending',
        progress: 0,
        url: request.url,
        userId: request.userId,
        fileType: request.fileType || 'video',
        quality: request.quality || 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Download request error:', error);
      throw error;
    }
  }

  async getDownloadStatus(jobId: string): Promise<DownloadJob | null> {
    try {
      // Try to check cache first, but don't fail if cache is unavailable
      let cached = null;
      try {
        cached = await cache.get<DownloadJob>(CACHE_KEYS.DOWNLOAD_STATUS(jobId));
        if (cached && (cached.status === 'completed' || cached.status === 'failed')) {
          // Don't make new requests for completed/failed downloads
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache unavailable for status check:', cacheError);
      }

      const response = await fetch(`${this.ytdlpBaseUrl}/download/${jobId}/status`, {
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Job not found - could be completed and cleaned up
          console.log(`Job ${jobId} not found (404) - may have been completed and cleaned up`);
          return null;
        }
        if (response.status === 429) {
          // Rate limited - return cached data if available, otherwise throw
          if (cached) {
            console.warn(`Rate limited for job ${jobId}, returning cached data`);
            return cached;
          }
          throw new Error(`Status check failed: Too Many Requests`);
        }
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const job = await response.json();
      
      // Try to update cache, but don't fail if cache is unavailable
      try {
        await cache.set(
          CACHE_KEYS.DOWNLOAD_STATUS(jobId),
          job,
          CACHE_TTL.DOWNLOAD_STATUS
        );
      } catch (cacheError) {
        console.warn('Cache unavailable for status update:', cacheError);
      }

      return job;
    } catch (error) {
      console.error('Get download status error:', error);
      
      // If it's a rate limiting error, don't spam logs
      if (error instanceof Error && error.message.includes('Too Many Requests')) {
        throw error; // Re-throw to be handled by sync with backoff
      }
      
      return null;
    }
  }

  async cancelDownload(jobId: string): Promise<boolean> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await fetch(`${this.ytdlpBaseUrl}/download/${jobId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Cancel request failed: ${response.statusText}`);
      }

      // Update cache
      const job = await this.getDownloadStatus(jobId);
      if (job) {
        job.status = 'failed';
        job.error = 'Cancelled by user';
        await cache.set(
          CACHE_KEYS.DOWNLOAD_STATUS(jobId),
          job,
          CACHE_TTL.DOWNLOAD_STATUS
        );
      }

      return true;
    });
  }

  async bulkDownload(requests: DownloadRequest[]): Promise<DownloadJob[]> {
    const jobs: DownloadJob[] = [];
    
    // Process in smaller batches to avoid overwhelming the service
    const batchSize = 3;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.requestDownload(request));
      
      try {
        const batchJobs = await Promise.all(batchPromises);
        jobs.push(...batchJobs);
      } catch (error) {
        console.error('Batch download error:', error);
        // Continue with remaining batches
      }

      // Add delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return jobs;
  }

  async extractMetadata(url: string): Promise<DownloadMetadata> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await fetch(`${this.ytdlpBaseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Metadata extraction failed: ${response.statusText}`);
      }

      const metadata = await response.json();
      return this.normalizeMetadata(metadata);
    });
  }

  private normalizeMetadata(rawMetadata: any): DownloadMetadata {
    return {
      title: rawMetadata.title,
      description: rawMetadata.description,
      duration: rawMetadata.duration,
      thumbnail: rawMetadata.thumbnail,
      uploader: rawMetadata.uploader || rawMetadata.channel,
      uploadDate: rawMetadata.upload_date,
      viewCount: rawMetadata.view_count,
      likeCount: rawMetadata.like_count,
      fileSize: rawMetadata.filesize || rawMetadata.filesize_approx,
      format: rawMetadata.format,
      resolution: rawMetadata.resolution,
    };
  }

  private getFormatString(fileType?: string, quality?: string): string {
    const formats = {
      video: {
        highest: 'bv*',  // Best video quality available, any format
        high: 'bv*',     // Best video quality available, any format
        medium: 'bv*[height<=720]',  // Best video quality up to 720p
        low: 'bv*[height<=480]',     // Best video quality up to 480p
      },
      audio: {
        highest: 'bestaudio[ext=mp3]/bestaudio',
        high: 'bestaudio[abr<=320][ext=mp3]/bestaudio[abr<=320]',
        medium: 'bestaudio[abr<=192][ext=mp3]/bestaudio[abr<=192]',
        low: 'bestaudio[abr<=128][ext=mp3]/bestaudio[abr<=128]',
      },
      image: {
        highest: 'best',
        high: 'best',
        medium: 'best',
        low: 'best',
      },
    };

    const type = fileType || 'video';
    const qual = quality || 'highest';
    
    return formats[type as keyof typeof formats]?.[qual as keyof typeof formats.video] || (type === 'video' ? 'bv*' : 'best');
  }

  async getSupportedSites(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ytdlpBaseUrl}/extractors`, {
        method: 'GET',
      });

      if (!response.ok) {
        // Return common sites as fallback
        return [
          'youtube.com',
          'youtu.be',
          'tiktok.com',
          'instagram.com',
          'twitter.com',
          'x.com',
          'facebook.com',
          'vimeo.com',
        ];
      }

      const data = await response.json();
      return data.extractors || [];
    } catch (error) {
      console.error('Failed to get supported sites:', error);
      return [];
    }
  }

  async validateUrl(url: string): Promise<{ valid: boolean; platform?: string; error?: string }> {
    try {
      // Basic URL validation
      new URL(url);
      
      // Check if it's from a supported platform
      const platform = this.detectPlatform(url);
      const supportedPlatforms = ['youtube', 'tiktok', 'instagram', 'twitter', 'facebook', 'vimeo', 'reddit'];
      
      if (platform === 'unknown') {
        return {
          valid: false,
          error: 'Unsupported platform. Supported platforms: YouTube, TikTok, Instagram, Twitter, Facebook, Vimeo, Reddit',
        };
      }
      
      return {
        valid: true,
        platform,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid URL format',
      };
    }
  }

  private detectPlatform(url: string): string {
    const platforms = {
      youtube: /(?:youtube\.com|youtu\.be)/i,
      tiktok: /tiktok\.com/i,
      instagram: /instagram\.com/i,
      twitter: /(?:twitter\.com|x\.com)/i,
      facebook: /facebook\.com/i,
      vimeo: /vimeo\.com/i,
      reddit: /reddit\.com/i,
    };

    for (const [platform, regex] of Object.entries(platforms)) {
      if (regex.test(url)) {
        return platform;
      }
    }

    return 'unknown';
  }

  async getJobHistory(userId: string, limit: number = 50): Promise<DownloadJob[]> {
    // This would typically fetch from database
    // For now, return empty array - will be implemented in API routes
    return [];
  }

  async retryDownload(jobId: string): Promise<DownloadJob> {
    const existingJob = await this.getDownloadStatus(jobId);
    if (!existingJob) {
      throw new Error('Job not found');
    }

    if (existingJob.status !== 'failed') {
      throw new Error('Can only retry failed downloads');
    }

    // Create new download request
    return this.requestDownload({
      url: existingJob.url,
      userId: existingJob.userId,
      fileType: existingJob.fileType as 'video' | 'audio' | 'image',
      quality: existingJob.quality as 'highest' | 'high' | 'medium' | 'low',
    });
  }

  async getDownloadStats(userId: string): Promise<{
    totalDownloads: number;
    successfulDownloads: number;
    failedDownloads: number;
    totalSize: number;
  }> {
    // This would typically aggregate from database
    // Will be implemented in API routes
    return {
      totalDownloads: 0,
      successfulDownloads: 0,
      failedDownloads: 0,
      totalSize: 0,
    };
  }

  /**
   * Create a new download record with file lifecycle management
   */
  async createDownloadRecord(data: {
    userId: string;
    trendId?: string;
    originalUrl: string;
    storageUrl: string;
    storageKey: string;
    fileType: string;
    fileSize?: number;
    duration?: number;
    metadata?: any;
  }): Promise<string> {
    try {
      // Use raw SQL to create record with new fields
      const result = await db.$queryRaw<Array<{ id: string }>>`
        INSERT INTO media_downloads (
          id, user_id, trend_id, original_url, storage_url, storage_key,
          file_type, file_size, original_file_size, duration, metadata,
          download_status, keep_file, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${data.userId}, ${data.trendId || null},
          ${data.originalUrl}, ${data.storageUrl}, ${data.storageKey},
          ${data.fileType}, ${data.fileSize || null}, ${data.fileSize || null},
          ${data.duration || null}, ${data.metadata ? JSON.stringify(data.metadata) : null}::jsonb,
          'completed', true, NOW(), NOW()
        ) RETURNING id
      `;

      const downloadId = result[0].id;

      // Trigger file lifecycle management for this user
      try {
        await cleanupService.triggerUserCleanupOnNewDownload(data.userId);
      } catch (cleanupError) {
        // Log cleanup error but don't fail the download creation
        console.error(`Failed to trigger cleanup for user ${data.userId}:`, cleanupError);
      }

      return downloadId;
    } catch (error) {
      console.error('Failed to create download record:', error);
      throw error;
    }
  }

  /**
   * Update download status and handle completion lifecycle
   */
  async updateDownloadStatus(
    downloadId: string,
    status: string,
    metadata?: {
      storageUrl?: string;
      storageKey?: string;
      fileSize?: number;
      duration?: number;
      error?: string;
    }
  ): Promise<void> {
    try {
      // Get current user for this download
      const download = await db.mediaDownload.findUnique({
        where: { id: downloadId },
        select: { userId: true },
      });

      if (!download) {
        throw new Error(`Download ${downloadId} not found`);
      }

      // Use raw SQL to update with new fields
      if (status === 'completed' && metadata) {
        await db.$executeRaw`
          UPDATE media_downloads
          SET download_status = ${status},
              storage_url = ${metadata.storageUrl || null},
              storage_key = ${metadata.storageKey || null},
              file_size = ${metadata.fileSize || null},
              original_file_size = ${metadata.fileSize || null},
              duration = ${metadata.duration || null},
              keep_file = true,
              file_cleanup_at = NULL,
              updated_at = NOW()
          WHERE id = ${downloadId}
        `;
      } else {
        await db.$executeRaw`
          UPDATE media_downloads
          SET download_status = ${status},
              updated_at = NOW()
          WHERE id = ${downloadId}
        `;
      }

      // If download is completed, trigger file lifecycle management
      if (status === 'completed') {
        try {
          await cleanupService.triggerUserCleanupOnNewDownload(download.userId);
        } catch (cleanupError) {
          console.error(`Failed to trigger cleanup for user ${download.userId}:`, cleanupError);
        }
      }
    } catch (error) {
      console.error(`Failed to update download ${downloadId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's active file stats (for quota management)
   */
  async getUserFileStats(userId: string): Promise<{
    activeFiles: number;
    totalSize: number;
    recentDownloads: number;
  }> {
    try {
      const [activeStats, recentCount] = await Promise.all([
        db.$queryRaw<Array<{ count: bigint; totalSize: bigint | null }>>`
          SELECT COUNT(*) as count, SUM(file_size) as "totalSize"
          FROM media_downloads
          WHERE user_id = ${userId}
            AND download_status = 'completed'
            AND keep_file = true
            AND storage_key IS NOT NULL
        `,
        db.mediaDownload.count({
          where: {
            userId,
            downloadStatus: 'completed',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

      return {
        activeFiles: Number(activeStats[0]?.count || 0),
        totalSize: Number(activeStats[0]?.totalSize || 0),
        recentDownloads: recentCount,
      };
    } catch (error) {
      console.error(`Failed to get file stats for user ${userId}:`, error);
      throw error;
    }
  }
}

export const mediaService = new MediaService();