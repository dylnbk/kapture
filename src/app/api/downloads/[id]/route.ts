import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
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

async function handleGET(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id || !validateUUID(id)) {
      return createNotFoundError('Invalid download ID');
    }

    // Get download from database first to check ownership
    const download = await db.mediaDownload.findUnique({
      where: { id },
      include: {
        trend: {
          select: {
            title: true,
            platform: true,
            url: true,
          },
        },
      },
    });

    if (!download) {
      return createNotFoundError('Download not found');
    }

    // Check ownership
    if (download.userId !== user.id) {
      return createForbiddenError('Access denied');
    }

    // Get real-time status from media service
    const jobStatus = await mediaService.getDownloadStatus(id);
    
    // Merge database data with real-time status
    const response = {
      id: download.id,
      originalUrl: download.originalUrl,
      storageUrl: download.storageUrl,
      storageKey: download.storageKey,
      fileType: download.fileType,
      fileSize: download.fileSize,
      duration: download.duration,
      metadata: download.metadata,
      downloadStatus: jobStatus?.status || download.downloadStatus,
      progress: jobStatus?.progress || 0,
      error: jobStatus?.error,
      trend: download.trend,
      createdAt: download.createdAt,
      updatedAt: download.updatedAt,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Get download status error:', error);
    return createInternalServerError('Failed to get download status');
  }
}

async function handleDELETE(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id || !validateUUID(id)) {
      return createNotFoundError('Invalid download ID');
    }

    // Get download from database to check ownership
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

    // Cancel the download job if it's still processing
    if (download.downloadStatus === 'processing' || download.downloadStatus === 'pending') {
      try {
        await mediaService.cancelDownload(id);
      } catch (error) {
        console.warn('Failed to cancel download job:', error);
        // Continue with deletion even if cancellation fails
      }
    }

    // Delete from database
    await db.mediaDownload.delete({
      where: { id },
    });

    return createSuccessResponse({ 
      message: 'Download deleted successfully',
      id 
    });
  } catch (error) {
    console.error('Delete download error:', error);
    return createInternalServerError('Failed to delete download');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));
export const DELETE = withErrorHandling(withAuth(handleDELETE));