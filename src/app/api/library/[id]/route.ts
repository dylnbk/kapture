import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { storageService } from '@/services/storage-service';
import { localStorageService } from '@/services/local-storage-service';
import {
  createSuccessResponse,
  createNotFoundError,
  createInternalServerError,
  withErrorHandling,
  withAuth,
  validateId
} from '@/lib/api-utils';

async function handleDELETE(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const downloadId = pathSegments[3]; // /api/library/[id] -> index 3 is the ID

    if (!downloadId || !validateId(downloadId)) {
      return createNotFoundError('Invalid download ID');
    }

    // Find the download
    const download = await db.mediaDownload.findFirst({
      where: {
        id: downloadId,
        userId: user.id,
        keepFile: true, // Only allow deletion of archived files
      },
    });

    if (!download) {
      return createNotFoundError('Archived item not found');
    }

    // Delete the actual file from storage if it exists
    if (download.storageKey) {
      try {
        const isUpload = download.originalUrl.startsWith('upload://');
        if (isUpload) {
          // Use local storage service for uploaded files
          await localStorageService.deleteFile(download.storageKey);
          console.log(`Deleted uploaded file from local storage: ${download.storageKey}`);
        } else {
          // Use cloud storage service for downloaded files
          await storageService.deleteFile(download.storageKey);
          console.log(`Deleted downloaded file from cloud storage: ${download.storageKey}`);
        }
      } catch (storageError) {
        console.error('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the database record completely
    await db.mediaDownload.delete({
      where: {
        id: downloadId,
      },
    });

    console.log(`Permanently deleted library item ${downloadId} for user ${user.id}`);

    return createSuccessResponse({
      message: 'Library item permanently deleted',
    });
  } catch (error) {
    console.error('Delete library item error:', error);
    return createInternalServerError('Failed to delete library item');
  }
}

export const DELETE = withErrorHandling(withAuth(handleDELETE));