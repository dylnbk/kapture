import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bulkDownloadSchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation,
  withUsageValidation
} from '@/lib/api-utils';
import { mediaService } from '@/services/media-service';
import { billingService } from '@/services/billing-service';

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    const { urls, fileType, quality } = data;

    // Check if user has enough usage quota for downloads
    const hasUsage = await billingService.checkUsageLimit(user.id, 'download');
    if (!hasUsage) {
      return createInternalServerError('Usage limit exceeded for downloads');
    }

    // Get current usage to check if user can handle this many downloads
    const currentUsage = await billingService.getUserUsage(user.id);
    const remainingDownloads = currentUsage.downloads.limit - currentUsage.downloads.current;
    if (urls.length > remainingDownloads) {
      return createInternalServerError(`Cannot process ${urls.length} downloads. Only ${remainingDownloads} remaining in your quota.`);
    }

    // Create download requests
    const downloadRequests = urls.map((url: string) => ({
      url,
      userId: user.id,
      fileType,
      quality,
    }));

    // Submit bulk download request to media service
    const jobs = await mediaService.bulkDownload(downloadRequests);

    // Save download records to database
    const mediaDownloads = await Promise.all(
      jobs.map(async (job) => {
        try {
          return await db.mediaDownload.create({
            data: {
              id: job.id,
              userId: user.id,
              originalUrl: job.url,
              storageUrl: '', // Will be updated when download completes
              storageKey: '', // Will be updated when download completes
              fileType: job.fileType,
              downloadStatus: job.status,
              metadata: job.metadata ? JSON.parse(JSON.stringify(job.metadata)) : {},
            },
          });
        } catch (error) {
          console.error('Failed to save download record:', error);
          return null;
        }
      })
    );

    // Filter out failed saves
    const successfulDownloads = mediaDownloads.filter(Boolean);

    // Update usage tracking
    if (successfulDownloads.length > 0) {
      try {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        await db.userUsage.upsert({
          where: {
            userId_usageType_periodStart: {
              userId: user.id,
              usageType: 'download',
              periodStart,
            },
          },
          update: {
            count: {
              increment: successfulDownloads.length,
            },
          },
          create: {
            userId: user.id,
            usageType: 'download',
            count: successfulDownloads.length,
            periodStart,
            periodEnd,
          },
        });
      } catch (error) {
        console.error('Failed to update usage:', error);
        // Don't fail the request for usage tracking errors
      }
    }

    const response = {
      downloads: successfulDownloads.map((download) => ({
        id: download?.id,
        originalUrl: download?.originalUrl,
        fileType: download?.fileType,
        downloadStatus: download?.downloadStatus,
        createdAt: download?.createdAt,
      })),
      total: successfulDownloads.length,
      failed: jobs.length - successfulDownloads.length,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Bulk download error:', error);
    return createInternalServerError('Failed to process bulk download');
  }
}

async function handleDELETE(req: NextRequest, user: any) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return createInternalServerError('No download IDs provided');
    }

    // Get downloads from database to check ownership
    const downloads = await db.mediaDownload.findMany({
      where: {
        id: { in: ids },
        userId: user.id, // Ensure user owns all downloads
      },
    });

    if (downloads.length !== ids.length) {
      return createInternalServerError('Some downloads not found or access denied');
    }

    // Cancel any processing downloads
    const processingDownloads = downloads.filter(
      d => d.downloadStatus === 'processing' || d.downloadStatus === 'pending'
    );

    for (const download of processingDownloads) {
      try {
        await mediaService.cancelDownload(download.id);
      } catch (error) {
        console.warn(`Failed to cancel download ${download.id}:`, error);
        // Continue with deletion even if cancellation fails
      }
    }

    // Delete from database
    const deleteResult = await db.mediaDownload.deleteMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
    });

    return createSuccessResponse({
      message: `${deleteResult.count} downloads deleted successfully`,
      deletedCount: deleteResult.count,
      requestedCount: ids.length,
    });
  } catch (error) {
    console.error('Bulk delete downloads error:', error);
    return createInternalServerError('Failed to delete downloads');
  }
}

export const POST = withErrorHandling(
  withAuth(
    withUsageValidation('download')(
      withValidation(bulkDownloadSchema)(handlePOST)
    )
  )
);

export const DELETE = withErrorHandling(withAuth(handleDELETE));