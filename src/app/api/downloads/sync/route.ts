import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mediaService } from '@/services/media-service';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest) {
  try {
    console.log('Starting download status sync...');
    
    // Get pending and processing downloads with smart batching
    const activeDownloads = await db.mediaDownload.findMany({
      where: {
        downloadStatus: {
          in: ['pending', 'processing']
        }
      },
      orderBy: {
        updatedAt: 'asc' // Prioritize downloads that haven't been updated recently
      },
      take: 15 // Increased batch size - yt-dlp service can handle more requests
    });

    console.log(`Found ${activeDownloads.length} active downloads to sync`);

    const syncResults = {
      total: activeDownloads.length,
      completed: 0,
      failed: 0,
      stillProcessing: 0,
      errors: [] as string[]
    };

    // Process each download
    for (const download of activeDownloads) {
      try {
        // Get status from yt-dlp service - more aggressive approach
        let status = null;
        let jobNotFound = false;
        
        try {
          status = await mediaService.getDownloadStatus(download.id);
          console.log(`Sync: Got status for ${download.id}:`, status?.status, `${status?.progress}%`);
        } catch (error: any) {
          if (error.message?.includes('404') || error.message?.includes('Job not found')) {
            jobNotFound = true;
            console.log(`Job ${download.id} not found in yt-dlp service - likely completed and cleaned up`);
          } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
            console.log(`Rate limited for download ${download.id}, will retry on next sync`);
            continue; // Skip this download for now, will retry on next sync
          } else {
            console.error(`Error getting status for ${download.id}:`, error.message);
            continue; // Skip this download, will retry on next sync
          }
        }
        
        // If job not found and download is old enough, mark as completed
        if (jobNotFound && !status) {
          const downloadAge = Date.now() - new Date(download.createdAt).getTime();
          const fiveMinutesInMs = 5 * 60 * 1000;
          
          if (downloadAge > fiveMinutesInMs) {
            console.log(`Marking orphaned download ${download.id} as completed (job not found, age: ${Math.round(downloadAge / 60000)}min)`);
            
            // Mark as completed in database
            await db.mediaDownload.update({
              where: { id: download.id },
              data: {
                downloadStatus: 'completed',
                updatedAt: new Date(),
                metadata: {
                  ...(download.metadata as Record<string, any> || {}),
                  completedAt: new Date().toISOString(),
                  autoCompleted: true,
                  reason: 'job_not_found_after_completion'
                }
              }
            });
            
            syncResults.completed++;
            continue;
          } else {
            console.warn(`Download ${download.id} job not found but too recent (${Math.round(downloadAge / 60000)}min), skipping`);
            continue;
          }
        }
        
        if (!status) {
          // If no status and download is old, check if we should force complete it
          const downloadAge = Date.now() - new Date(download.createdAt).getTime();
          const tenMinutesInMs = 10 * 60 * 1000;
          
          if (downloadAge > tenMinutesInMs && download.downloadStatus === 'pending') {
            console.log(`Forcing completion of stuck download ${download.id} (age: ${Math.round(downloadAge / 60000)}min)`);
            
            await db.mediaDownload.update({
              where: { id: download.id },
              data: {
                downloadStatus: 'completed',
                updatedAt: new Date(),
                metadata: {
                  ...(download.metadata as Record<string, any> || {}),
                  completedAt: new Date().toISOString(),
                  autoCompleted: true,
                  reason: 'forced_completion_after_timeout'
                }
              }
            });
            
            syncResults.completed++;
            continue;
          }
          
          console.warn(`No status found for download ${download.id} after ${maxRetries} retries`);
          continue;
        }

        const updateData: any = {
          updatedAt: new Date(),
        };

        // Handle status changes - prioritize completion detection
        if (status && (status.status === 'completed' || status.progress === 100)) {
          console.log(`🎉 Download ${download.id} is COMPLETED! Updating database...`);
          
          // Always mark as completed if yt-dlp says so
          updateData.downloadStatus = 'completed';
          updateData.storageUrl = `/api/downloads/files/${download.id}`;
          updateData.storageKey = `downloads/${download.id}/`;
          
          // Set default file lifecycle (7 days retention)
          const cleanupDate = new Date();
          cleanupDate.setDate(cleanupDate.getDate() + 7);
          updateData.fileCleanupAt = cleanupDate;
          updateData.keepFile = false;
          
          // Update metadata with completion info
          const currentMetadata = download.metadata as Record<string, any> || {};
          updateData.metadata = {
            ...currentMetadata,
            ...status.metadata,
            progress: 100,
            detailedProgress: {
              percentage: 100,
              currentPhase: 'Completed',
              phases: [
                { name: 'Queue', status: 'completed' },
                { name: 'Extract Info', status: 'completed' },
                { name: 'Download', status: 'completed' },
                { name: 'Process', status: 'completed' },
                { name: 'Complete', status: 'completed' }
              ]
            },
            completedAt: new Date().toISOString()
          };
          
          syncResults.completed++;
          console.log(`✅ Download ${download.id} marked as completed in database`);
        } else if (status.status === 'failed' && download.downloadStatus !== 'failed') {
          updateData.downloadStatus = 'failed';
          updateData.metadata = {
            ...(download.metadata as Record<string, any> || {}),
            error: status.error || 'Download failed',
            failedAt: new Date().toISOString()
          };
          syncResults.failed++;
          console.log(`Download ${download.id} failed: ${status.error}`);
        } else if (status.status === 'processing') {
          updateData.downloadStatus = 'processing';
          
          // Always update progress and detailed progress for processing downloads
          const currentMetadata = download.metadata as Record<string, any> || {};
          updateData.metadata = {
            ...currentMetadata,
            progress: status.progress || 0,
            detailedProgress: status.detailedProgress || null,
            lastProgressUpdate: new Date().toISOString()
          };
          
          syncResults.stillProcessing++;
          console.log(`Updated progress for ${download.id}: ${status.progress}% - Phase: ${status.detailedProgress?.currentPhase}`);
        }

        // Update the download record
        await db.mediaDownload.update({
          where: { id: download.id },
          data: updateData
        });

      } catch (error) {
        console.error(`Error syncing download ${download.id}:`, error);
        syncResults.errors.push(`${download.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('Download sync completed:', syncResults);

    return createSuccessResponse({
      message: 'Download status sync completed',
      results: syncResults
    });

  } catch (error) {
    console.error('Download sync error:', error);
    return createInternalServerError('Failed to sync download statuses');
  }
}

export const POST = withErrorHandling(handlePOST);