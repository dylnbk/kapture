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
    
    // Get all pending and processing downloads
    const activeDownloads = await db.mediaDownload.findMany({
      where: {
        downloadStatus: {
          in: ['pending', 'processing']
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 50 // Limit to prevent overwhelming the system
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
        // Get status from yt-dlp service
        const status = await mediaService.getDownloadStatus(download.id);
        
        if (!status) {
          console.warn(`No status found for download ${download.id}`);
          continue;
        }

        const updateData: any = {
          updatedAt: new Date(),
        };

        // Handle status changes
        if (status.status === 'completed' && download.downloadStatus !== 'completed') {
          // Download completed - get file info and update storage URL
          try {
            const ytdlpServiceUrl = process.env.YTDLP_SERVICE_URL || 'http://localhost:3001';
            const filesResponse = await fetch(`${ytdlpServiceUrl}/download/${download.id}/files`);
            
            if (filesResponse.ok) {
              const fileData = await filesResponse.json();
              const files = fileData.files || [];
              
              if (files.length > 0) {
                const mainFile = files[0];
                updateData.downloadStatus = 'completed';
                updateData.storageUrl = `/api/downloads/files/${download.id}`;
                updateData.storageKey = `downloads/${download.id}/${mainFile.name}`;
                updateData.fileSize = mainFile.size;
                
                // Set default file lifecycle (7 days retention)
                const cleanupDate = new Date();
                cleanupDate.setDate(cleanupDate.getDate() + 7);
                updateData.fileCleanupAt = cleanupDate;
                updateData.keepFile = false;
                
                // Update metadata with file info
                const currentMetadata = download.metadata as Record<string, any> || {};
                updateData.metadata = {
                  ...currentMetadata,
                  ...status.metadata,
                  fileName: mainFile.name,
                  actualFileSize: mainFile.size,
                  completedAt: new Date().toISOString()
                };
                
                // Note: title, thumbnail, platform are stored in metadata JSON field
                // No direct field updates needed since metadata already contains this info
                
                syncResults.completed++;
                console.log(`Download ${download.id} completed successfully`);
              }
            }
          } catch (fileError) {
            console.error(`Failed to get file info for ${download.id}:`, fileError);
            updateData.downloadStatus = 'failed';
            updateData.metadata = {
              ...(download.metadata as Record<string, any> || {}),
              error: 'Failed to retrieve downloaded file'
            };
            syncResults.failed++;
          }
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
          
          // Update progress if available
          if (status.progress !== undefined) {
            const currentMetadata = download.metadata as Record<string, any> || {};
            updateData.metadata = {
              ...currentMetadata,
              progress: status.progress,
              lastProgressUpdate: new Date().toISOString()
            };
          }
          
          syncResults.stillProcessing++;
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