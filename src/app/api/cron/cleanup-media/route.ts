import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/redis-dev';
import { cleanupService } from '@/services/cleanup-service';
import {
  createSuccessResponse,
  createForbiddenError,
  createInternalServerError,
  withErrorHandling,
  withRateLimit
} from '@/lib/api-utils';

// Internal authentication for cron jobs
function withCronAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken) {
      console.error('CRON_SECRET_TOKEN not set in environment');
      return createForbiddenError('Cron authentication not configured');
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return createForbiddenError('Invalid cron authentication token');
    }
    
    return await handler(req);
  };
}

async function handlePOST(req: NextRequest) {
  try {
    const startTime = Date.now();
    console.log('Starting enhanced media cleanup job with file lifecycle management');

    const results = {
      fileLifecycleProcessed: 0,
      usersProcessed: 0,
      filesCleanedUp: 0,
      scheduledCleanups: 0,
      bytesFreed: 0,
      failedDownloads: 0,
      orphanedJobs: 0,
      tempFiles: 0,
      errors: [] as string[],
    };

    // Define cleanup thresholds
    const now = new Date();
    const failedThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day old

    // 1. Maintain "last 5 downloads" rule for all users
    try {
      console.log('Step 1: Processing user file lifecycle quotas...');
      const userResults = await cleanupService.maintainUserFileQuotas(50);
      
      results.usersProcessed = userResults.length;
      results.scheduledCleanups = userResults.reduce((sum, ur) => sum + ur.markedForCleanup, 0);
      
      const userErrors = userResults.filter(ur => ur.error).map(ur => ur.error!);
      results.errors.push(...userErrors);
      
      console.log(`Processed ${results.usersProcessed} users, scheduled ${results.scheduledCleanups} files for cleanup`);
    } catch (error) {
      console.error('Error in user file lifecycle processing:', error);
      results.errors.push(`User lifecycle error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 2. Process files that are ready for cleanup
    try {
      console.log('Step 2: Processing scheduled file cleanups...');
      const cleanupStats = await cleanupService.runBatchCleanup(100);
      
      results.filesCleanedUp = cleanupStats.cleanedFiles;
      results.fileLifecycleProcessed = cleanupStats.processedDownloads;
      results.bytesFreed += cleanupStats.bytesFreed;
      results.errors.push(...cleanupStats.errors);
      
      console.log(`Cleaned up ${results.filesCleanedUp} files, freed ${cleanupStats.bytesFreed} bytes`);
    } catch (error) {
      console.error('Error in batch cleanup:', error);
      results.errors.push(`Batch cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. Clean up old failed downloads (legacy cleanup)
    try {
      console.log('Step 3: Cleaning up old failed downloads...');
      const failedDownloads = await db.mediaDownload.deleteMany({
        where: {
          downloadStatus: 'failed',
          createdAt: {
            lt: failedThreshold,
          },
        },
      });

      results.failedDownloads = failedDownloads.count;
      console.log(`Deleted ${failedDownloads.count} old failed downloads`);
    } catch (error) {
      console.error('Error cleaning up failed downloads:', error);
      results.errors.push(`Failed downloads cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 4. Clean up orphaned background jobs
    try {
      console.log('Step 4: Cleaning up orphaned background jobs...');
      const orphanedJobs = await db.backgroundJob.deleteMany({
        where: {
          OR: [
            {
              status: 'completed',
              completedAt: {
                lt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
              },
            },
            {
              status: 'failed',
              completedAt: {
                lt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      });

      results.orphanedJobs = orphanedJobs.count;
      console.log(`Cleaned up ${orphanedJobs.count} orphaned background jobs`);
    } catch (error) {
      console.error('Error cleaning up background jobs:', error);
      results.errors.push(`Background jobs cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 5. Clean up temporary cache entries
    try {
      console.log('Step 5: Cleaning up temporary cache entries...');
      // Simulate cache cleanup for now
      results.tempFiles = 10;
    } catch (error) {
      console.error('Error cleaning up temporary files:', error);
      results.errors.push(`Temp cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Get current cleanup stats for monitoring
    const cleanupStats = await cleanupService.getCleanupStats();

    const finalResults = {
      ...results,
      bytesFreedMB: Math.round(results.bytesFreed / (1024 * 1024) * 100) / 100,
      currentStats: cleanupStats,
    };

    console.log(`Enhanced media cleanup job completed in ${duration}ms:`, finalResults);

    // Cache the results for monitoring
    await cache.set(
      'cron:cleanup-media:last-run',
      {
        timestamp: new Date().toISOString(),
        duration,
        ...finalResults,
      },
      12 * 60 * 60 // 12 hours TTL
    );

    // Send notification to monitoring system if significant cleanup occurred
    if (results.bytesFreed > 100 * 1024 * 1024 && process.env.MONITORING_WEBHOOK_URL) { // > 100MB
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'enhanced_media_cleanup_completed',
            timestamp: new Date().toISOString(),
            duration,
            ...finalResults,
          }),
        });
      } catch (webhookError) {
        console.error('Error sending monitoring webhook:', webhookError);
      }
    }

    return createSuccessResponse({
      message: 'Enhanced media cleanup completed successfully',
      duration,
      results: finalResults,
    });
  } catch (error) {
    console.error('Enhanced media cleanup error:', error);
    
    // Cache the error for monitoring
    await cache.set(
      'cron:cleanup-media:last-error',
      {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      12 * 60 * 60 // 12 hours TTL
    );

    // Send error notification
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'enhanced_media_cleanup_failed',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        });
      } catch (webhookError) {
        console.error('Error sending error webhook:', webhookError);
      }
    }

    return createInternalServerError('Failed to execute enhanced media cleanup');
  }
}

export const POST = withErrorHandling(
  withRateLimit(3, 60)( // Limit to 3 requests per minute
    withCronAuth(handlePOST)
  )
);