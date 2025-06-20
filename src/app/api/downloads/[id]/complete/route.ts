import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, user: any) {
  try {
    const downloadId = req.url?.split('/downloads/')[1]?.split('/complete')[0];
    
    if (!downloadId) {
      return createInternalServerError('Download ID is required');
    }

    // Find the download
    const download = await db.mediaDownload.findFirst({
      where: {
        id: downloadId,
        userId: user.id
      }
    });

    if (!download) {
      return createInternalServerError('Download not found');
    }

    console.log(`Manually completing download ${downloadId} for user ${user.id}`);

    // Force complete the download
    await db.mediaDownload.update({
      where: { id: downloadId },
      data: {
        downloadStatus: 'completed',
        storageUrl: `/api/downloads/files/${downloadId}`,
        storageKey: `downloads/${downloadId}/`,
        updatedAt: new Date(),
        metadata: {
          ...(download.metadata as Record<string, any> || {}),
          completedAt: new Date().toISOString(),
          manualCompletion: true,
          completedBy: user.id
        }
      }
    });

    return createSuccessResponse({
      id: downloadId,
      status: 'completed',
      message: 'Download manually completed'
    });

  } catch (error) {
    console.error('Manual completion error:', error);
    return createInternalServerError('Failed to complete download');
  }
}

export const POST = withErrorHandling(withAuth(handlePOST));