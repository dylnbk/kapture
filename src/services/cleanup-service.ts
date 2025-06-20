import { db, getDownloadsNeedingCleanup, markDownloadFilesCleaned, processUserFileLifecycle } from '@/lib/db';
import { storageService } from './storage-service';

interface CleanupStats {
  processedDownloads: number;
  cleanedFiles: number;
  bytesFreed: number;
  errors: string[];
}

interface UserCleanupResult {
  userId: string;
  markedForCleanup: number;
  error?: string;
}

class CleanupService {
  /**
   * Process file cleanup for individual downloads
   * Removes files from storage and updates database records
   */
  async processFileCleanup(downloadIds: string[]): Promise<CleanupStats> {
    const stats: CleanupStats = {
      processedDownloads: 0,
      cleanedFiles: 0,
      bytesFreed: 0,
      errors: [],
    };

    if (downloadIds.length === 0) {
      return stats;
    }

    try {
      // Get download details before cleanup
      const downloads = await db.mediaDownload.findMany({
        where: {
          id: {
            in: downloadIds,
          },
        },
        select: {
          id: true,
          storageKey: true,
          fileSize: true,
          userId: true,
        },
      });

      // Process each download
      for (const download of downloads) {
        try {
          if (download.storageKey) {
            // Delete file from storage
            await storageService.deleteFile(download.storageKey);
            stats.cleanedFiles++;
            
            if (download.fileSize) {
              stats.bytesFreed += download.fileSize;
            }
          }
          
          stats.processedDownloads++;
        } catch (error) {
          const errorMsg = `Failed to delete file for download ${download.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          stats.errors.push(errorMsg);
        }
      }

      // Update database records to remove file references
      const cleanedIds = downloads
        .filter((_, index) => index < stats.processedDownloads)
        .map(d => d.id);
      
      if (cleanedIds.length > 0) {
        await markDownloadFilesCleaned(cleanedIds);
      }

    } catch (error) {
      const errorMsg = `Batch cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      stats.errors.push(errorMsg);
    }

    return stats;
  }

  /**
   * Run batch cleanup for all downloads that need file cleanup
   */
  async runBatchCleanup(batchSize: number = 50): Promise<CleanupStats> {
    const totalStats: CleanupStats = {
      processedDownloads: 0,
      cleanedFiles: 0,
      bytesFreed: 0,
      errors: [],
    };

    try {
      let hasMore = true;
      
      while (hasMore) {
        // Get next batch of downloads needing cleanup
        const downloads = await getDownloadsNeedingCleanup(batchSize);
        
        if (downloads.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`Processing batch of ${downloads.length} downloads for cleanup`);

        const downloadIds = downloads.map(d => d.id);
        const batchStats = await this.processFileCleanup(downloadIds);

        // Merge stats
        totalStats.processedDownloads += batchStats.processedDownloads;
        totalStats.cleanedFiles += batchStats.cleanedFiles;
        totalStats.bytesFreed += batchStats.bytesFreed;
        totalStats.errors.push(...batchStats.errors);

        // If we processed fewer than the batch size, we're done
        if (downloads.length < batchSize) {
          hasMore = false;
        }

        // Add a small delay between batches to avoid overwhelming the storage service
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      const errorMsg = `Batch cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      totalStats.errors.push(errorMsg);
    }

    return totalStats;
  }

  /**
   * Maintain the "last 5 downloads" rule for all users
   */
  async maintainUserFileQuotas(batchSize: number = 100): Promise<UserCleanupResult[]> {
    const results: UserCleanupResult[] = [];

    try {
      // Get all users who have completed downloads
      const usersWithDownloads = await db.mediaDownload.groupBy({
        by: ['userId'],
        where: {
          downloadStatus: 'completed',
        },
        _count: {
          id: true,
        },
        having: {
          id: {
            _count: {
              gt: 5, // Only process users with more than 5 downloads
            },
          },
        },
      });

      console.log(`Found ${usersWithDownloads.length} users with more than 5 downloads`);

      // Process in batches
      for (let i = 0; i < usersWithDownloads.length; i += batchSize) {
        const batch = usersWithDownloads.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (userGroup) => {
          try {
            const result = await processUserFileLifecycle(userGroup.userId);
            return {
              userId: userGroup.userId,
              markedForCleanup: result.markedForCleanup,
            };
          } catch (error) {
            const errorMsg = `Failed to process user ${userGroup.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMsg);
            return {
              userId: userGroup.userId,
              markedForCleanup: 0,
              error: errorMsg,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches
        if (i + batchSize < usersWithDownloads.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } catch (error) {
      console.error('Error in maintainUserFileQuotas:', error);
      throw error;
    }

    return results;
  }

  /**
   * Trigger cleanup when a new download is completed
   */
  async triggerUserCleanupOnNewDownload(userId: string): Promise<{ markedForCleanup: number }> {
    try {
      return await processUserFileLifecycle(userId);
    } catch (error) {
      console.error(`Failed to trigger cleanup for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics for monitoring
   */
  async getCleanupStats(): Promise<{
    pendingCleanup: number;
    totalDownloads: number;
    activeFiles: number;
    scheduledCleanups: number;
  }> {
    try {
      const [pendingCleanup, totalDownloads, activeFiles, scheduledCleanups] = await Promise.all([
        // Downloads that need cleanup right now
        db.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM media_downloads
          WHERE keep_file = false
            AND file_cleanup_at <= ${new Date()}
            AND storage_key IS NOT NULL
        `.then(result => Number(result[0]?.count || 0)),
        
        // Total completed downloads
        db.mediaDownload.count({
          where: {
            downloadStatus: 'completed',
          },
        }),
        
        // Files still being kept
        db.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM media_downloads 
          WHERE download_status = 'completed'
            AND keep_file = true
            AND storage_key IS NOT NULL
        `,
        
        // Downloads scheduled for future cleanup
        db.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM media_downloads
          WHERE keep_file = false
            AND file_cleanup_at > ${new Date()}
        `.then(result => Number(result[0]?.count || 0)),
      ]);

      return {
        pendingCleanup,
        totalDownloads,
        activeFiles: Number(activeFiles[0]?.count || 0),
        scheduledCleanups,
      };
    } catch (error) {
      console.error('Failed to get cleanup stats:', error);
      throw error;
    }
  }

  /**
   * Emergency cleanup - force cleanup of old files regardless of lifecycle rules
   */
  async emergencyCleanup(olderThanDays: number = 30): Promise<CleanupStats> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const oldDownloads = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM media_downloads
        WHERE download_status = 'completed'
          AND created_at < ${cutoffDate}
          AND storage_key IS NOT NULL
          AND keep_file = false  -- Respect archived files even in emergency cleanup
      `;

      console.log(`Emergency cleanup: Found ${oldDownloads.length} downloads older than ${olderThanDays} days`);

      if (oldDownloads.length === 0) {
        return {
          processedDownloads: 0,
          cleanedFiles: 0,
          bytesFreed: 0,
          errors: [],
        };
      }

      const downloadIds = oldDownloads.map(d => d.id);
      return await this.processFileCleanup(downloadIds);
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      throw error;
    }
  }
}

export const cleanupService = new CleanupService();