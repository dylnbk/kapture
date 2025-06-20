import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validateUUID } from '@/lib/api-utils';
import { 
  createSuccessResponse, 
  createNotFoundError,
  createForbiddenError,
  createInternalServerError,
  withErrorHandling,
  withAuth 
} from '@/lib/api-utils';

async function handleGET(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    // Validate UUID format
    if (!validateUUID(id)) {
      return createNotFoundError('Invalid trend ID format');
    }

    // Find the trend with related downloads
    const trend = await db.trend.findUnique({
      where: { id },
      include: {
        downloads: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!trend) {
      return createNotFoundError('Trend not found');
    }

    // Check ownership
    if (trend.userId !== user.id) {
      return createForbiddenError('Access denied to this trend');
    }

    return createSuccessResponse({
      trend,
      downloadCount: trend.downloads.length,
    });
  } catch (error) {
    console.error('Get trend error:', error);
    return createInternalServerError('Failed to retrieve trend');
  }
}

async function handleDELETE(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    // Validate UUID format
    if (!validateUUID(id)) {
      return createNotFoundError('Invalid trend ID format');
    }

    // Find the trend first to check ownership
    const trend = await db.trend.findUnique({
      where: { id },
      include: {
        downloads: true,
      },
    });

    if (!trend) {
      return createNotFoundError('Trend not found');
    }

    // Check ownership
    if (trend.userId !== user.id) {
      return createForbiddenError('Access denied to this trend');
    }

    // Use transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // Delete related downloads first (cascade should handle this, but being explicit)
      await tx.mediaDownload.deleteMany({
        where: { trendId: id },
      });

      // Delete the trend
      await tx.trend.delete({
        where: { id },
      });
    });

    return createSuccessResponse({
      message: 'Trend deleted successfully',
      deletedTrendId: id,
      deletedDownloads: trend.downloads.length,
    });
  } catch (error) {
    console.error('Delete trend error:', error);
    return createInternalServerError('Failed to delete trend');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));
export const DELETE = withErrorHandling(withAuth(handleDELETE));