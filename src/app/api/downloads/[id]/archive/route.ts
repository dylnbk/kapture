import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  createSuccessResponse, 
  createNotFoundError,
  createInternalServerError,
  withErrorHandling,
  withAuth,
  validateUUID
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const downloadId = pathSegments[3]; // /api/downloads/[id]/archive -> index 3 is the ID

    if (!downloadId || !validateUUID(downloadId)) {
      return createNotFoundError('Invalid download ID');
    }

    // Find the download
    const download = await db.mediaDownload.findFirst({
      where: {
        id: downloadId,
        userId: user.id,
      },
    });

    if (!download) {
      return createNotFoundError('Download not found');
    }

    // Archive the download by setting keepFile to true and removing cleanup date
    const archivedDownload = await db.mediaDownload.update({
      where: {
        id: downloadId,
      },
      data: {
        keepFile: true,
        fileCleanupAt: null, // Remove cleanup date to keep permanently
      },
    });

    console.log(`Successfully archived download ${downloadId} for user ${user.id}:`, {
      id: archivedDownload.id,
      keepFile: archivedDownload.keepFile,
      fileCleanupAt: archivedDownload.fileCleanupAt,
      downloadStatus: archivedDownload.downloadStatus,
    });

    return createSuccessResponse({
      message: 'Download archived successfully',
      download: archivedDownload,
    });
  } catch (error) {
    console.error('Archive download error:', error);
    return createInternalServerError('Failed to archive download');
  }
}

export const POST = withErrorHandling(withAuth(handlePOST));