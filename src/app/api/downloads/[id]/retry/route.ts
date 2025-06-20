import { NextRequest } from 'next/server';
import { db, incrementUserUsage } from '@/lib/db';
import { 
  createSuccessResponse, 
  createNotFoundError,
  createInternalServerError,
  createForbiddenError,
  withErrorHandling,
  withAuth,
  validateUUID
} from '@/lib/api-utils';
import { mediaService } from '@/services/media-service';

async function handlePOST(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // Get ID from /downloads/[id]/retry

    if (!id || !validateUUID(id)) {
      return createNotFoundError('Invalid download ID');
    }

    // Get download from database to check ownership and status
    const download = await db.mediaDownload.findUnique({
      where: { id },
    });

    if (!download) {
      return createNotFoundError('Download not found');
    }

    // Check ownership
    if (download.userId !== user.id) {
      return createForbiddenError('Access denied');
    }

    // Only allow retry for failed downloads
    if (download.downloadStatus !== 'failed') {
      return createInternalServerError('Can only retry failed downloads');
    }

    // Parse metadata safely
    const metadata = download.metadata as Record<string, any> || {};
    
    // Reset download status and retry with media service
    const retryJob = await mediaService.requestDownload({
      url: download.originalUrl,
      userId: user.id,
      fileType: download.fileType as 'video' | 'audio' | 'image',
      quality: metadata.quality || 'high',
      trendId: download.trendId || undefined,
    });

    // Update the download record
    const updatedDownload = await db.mediaDownload.update({
      where: { id },
      data: {
        downloadStatus: 'pending',
        metadata: {
          ...metadata,
          jobId: retryJob.id,
          retryCount: (metadata.retryCount || 0) + 1,
          lastRetryAt: new Date().toISOString(),
        },
      },
    });

    // Increment usage counter for retry
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    await incrementUserUsage(user.id, 'download', periodStart, periodEnd, 1);

    const updatedMetadata = updatedDownload.metadata as Record<string, any> || {};
    
    return createSuccessResponse({
      download: {
        id: updatedDownload.id,
        downloadStatus: updatedDownload.downloadStatus,
        jobId: retryJob.id,
        retryCount: updatedMetadata.retryCount || 1,
      },
      message: 'Download retry initiated successfully',
    });
  } catch (error) {
    console.error('Retry download error:', error);
    return createInternalServerError('Failed to retry download');
  }
}

export const POST = withErrorHandling(withAuth(handlePOST));