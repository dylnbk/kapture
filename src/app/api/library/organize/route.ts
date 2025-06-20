import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { organizeLibrarySchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createNotFoundError,
  createForbiddenError,
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    const { mediaIds, action, tags } = data;

    // First, verify all media items exist and belong to the user
    const mediaItems = await db.mediaDownload.findMany({
      where: {
        id: { in: mediaIds },
        userId: user.id,
      },
      select: {
        id: true,
        metadata: true,
        trend: {
          select: {
            title: true,
            platform: true,
          },
        },
      },
    });

    // Check if all requested items were found
    if (mediaItems.length !== mediaIds.length) {
      const foundIds = mediaItems.map(item => item.id);
      const missingIds = mediaIds.filter((id: string) => !foundIds.includes(id));
      
      return createNotFoundError(
        `Some media items not found or access denied: ${missingIds.join(', ')}`
      );
    }

    let results: any;

    // Perform the requested action using a transaction
    await db.$transaction(async (tx) => {
      switch (action) {
        case 'delete':
          results = await tx.mediaDownload.deleteMany({
            where: {
              id: { in: mediaIds },
              userId: user.id,
            },
          });
          break;

        case 'archive':
          // Update metadata to mark items as archived
          const archiveUpdates = mediaItems.map(item => {
            const currentMetadata = (item.metadata as any) || {};
            return tx.mediaDownload.update({
              where: { id: item.id },
              data: {
                metadata: {
                  ...currentMetadata,
                  archived: true,
                  archivedAt: new Date().toISOString(),
                  ...(tags && { tags: [...(currentMetadata.tags || []), ...tags] }),
                },
              },
            });
          });
          results = await Promise.all(archiveUpdates);
          break;

        case 'favorite':
          // Update metadata to mark items as favorites
          const favoriteUpdates = mediaItems.map(item => {
            const currentMetadata = (item.metadata as any) || {};
            return tx.mediaDownload.update({
              where: { id: item.id },
              data: {
                metadata: {
                  ...currentMetadata,
                  favorite: true,
                  favoritedAt: new Date().toISOString(),
                  ...(tags && { tags: [...(currentMetadata.tags || []), ...tags] }),
                },
              },
            });
          });
          results = await Promise.all(favoriteUpdates);
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    });

    // Prepare response based on action
    const responseData: any = {
      action,
      processedCount: mediaIds.length,
      mediaIds,
    };

    switch (action) {
      case 'delete':
        responseData.deletedCount = results.count;
        responseData.message = `Successfully deleted ${results.count} media items`;
        break;

      case 'archive':
        responseData.archivedItems = results.map((item: any) => ({
          id: item.id,
          archived: true,
          archivedAt: item.metadata.archivedAt,
        }));
        responseData.message = `Successfully archived ${results.length} media items`;
        break;

      case 'favorite':
        responseData.favoritedItems = results.map((item: any) => ({
          id: item.id,
          favorite: true,
          favoritedAt: item.metadata.favoritedAt,
        }));
        responseData.message = `Successfully favorited ${results.length} media items`;
        break;
    }

    // Add tags information if provided
    if (tags && tags.length > 0) {
      responseData.tagsAdded = tags;
    }

    // Add summary information about the processed items
    const platformSummary = mediaItems.reduce((acc: Record<string, number>, item) => {
      const platform = item.trend?.platform || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {});

    responseData.summary = {
      totalProcessed: mediaItems.length,
      platformBreakdown: platformSummary,
    };

    return createSuccessResponse(responseData);
  } catch (error) {
    console.error('Library organize error:', error);
    return createInternalServerError('Failed to organize library content');
  }
}

export const POST = withErrorHandling(withAuth(withValidation(organizeLibrarySchema)(handlePOST)));