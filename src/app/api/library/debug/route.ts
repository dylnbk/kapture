import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth 
} from '@/lib/api-utils';

async function handleGET(req: NextRequest, user: any) {
  try {
    // Get all downloads for this user to debug
    const allDownloads = await db.mediaDownload.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        downloadStatus: true,
        keepFile: true,
        fileCleanupAt: true,
        originalUrl: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get specifically archived files
    const archivedFiles = await db.mediaDownload.findMany({
      where: {
        userId: user.id,
        keepFile: true,
        downloadStatus: 'completed',
      },
      include: {
        trend: true,
      },
    });

    return createSuccessResponse({
      totalDownloads: allDownloads.length,
      archivedFiles: archivedFiles.length,
      allDownloads,
      archivedFilesData: archivedFiles,
    });
  } catch (error) {
    console.error('Debug library error:', error);
    return createInternalServerError('Failed to debug library');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));