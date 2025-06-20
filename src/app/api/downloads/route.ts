import { NextRequest } from 'next/server';
import { db, getUserDownloads, getUserStorageStats } from '@/lib/db';
import { getQueryParams, createPaginatedResponse } from '@/lib/api-utils';
import {
  createSuccessResponse,
  createInternalServerError,
  withErrorHandling,
  withAuth
} from '@/lib/api-utils';
import { mediaService } from '@/services/media-service';

async function handleGET(req: NextRequest, user: any) {
  try {
    const params = getQueryParams(req);
    const page = parseInt(params.page as string) || 1;
    const limit = parseInt(params.limit as string) || 10;
    const status = params.status as string;
    const includeStats = params.includeStats === 'true';
    const offset = (page - 1) * limit;

    const downloads = await getUserDownloads(user.id, {
      status,
      limit,
      offset,
    });

    // Get total count for pagination
    const total = await db.mediaDownload.count({
      where: {
        userId: user.id,
        // Only filter by keepFile for non-active downloads
        ...(status && (status.includes('pending') || status.includes('processing'))
          ? {} // Don't filter by keepFile for active downloads
          : { keepFile: false } // Exclude archived files from count for completed downloads
        ),
        ...(status && {
          downloadStatus: {
            in: status.split(',').map(s => s.trim())
          }
        }),
      },
    });

    const response = createPaginatedResponse(downloads, page, limit, total);

    // Optionally include file lifecycle stats
    if (includeStats) {
      try {
        const [storageStats, fileStats] = await Promise.all([
          getUserStorageStats(user.id),
          mediaService.getUserFileStats(user.id),
        ]);

        (response.meta as any).fileLifecycle = {
          totalDownloads: storageStats.totalDownloads,
          activeFiles: storageStats.activeFiles,
          totalActiveSize: fileStats.totalSize,
          recentDownloads: fileStats.recentDownloads,
          filesKeptRatio: storageStats.totalDownloads > 0
            ? Math.round((storageStats.activeFiles / storageStats.totalDownloads) * 100)
            : 0,
        };
      } catch (statsError) {
        console.error('Failed to get file stats:', statsError);
        // Don't fail the request if stats fail
      }
    }

    return createSuccessResponse(response.data, response.meta);
  } catch (error) {
    console.error('Get downloads error:', error);
    return createInternalServerError('Failed to get downloads');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));