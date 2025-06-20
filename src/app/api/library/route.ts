import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getQueryParams, createPaginatedResponse } from '@/lib/api-utils';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth 
} from '@/lib/api-utils';

async function handleGET(req: NextRequest, user: any) {
  try {
    const params = getQueryParams(req);
    const page = parseInt(params.page as string) || 1;
    const limit = parseInt(params.limit as string) || 10;
    const fileType = params.fileType as string;
    const platform = params.platform as string;
    const query = params.query as string;
    const category = params.category as string || 'downloaded'; // downloaded, scraped, uploaded
    const offset = (page - 1) * limit;

    console.log('Library API called with params:', { userId: user.id, category, fileType, platform, query });

    // Build where clause for search - only show archived/kept files in library
    const where: any = {
      userId: user.id,
      downloadStatus: 'completed',
      keepFile: true, // Only show archived files in library
    };

    // Category filtering
    if (category === 'scraped') {
      // This would be for scraped content without downloads - for future use
      // For now, return empty results as this feature isn't implemented yet
      where.id = 'never-match'; // No results for scraped category yet
    } else if (category === 'uploaded') {
      // Direct file uploads - show only uploaded files
      where.originalUrl = { startsWith: 'upload://' };
    } else if (category === 'downloaded') {
      // Downloaded content - exclude uploads
      where.originalUrl = { not: { startsWith: 'upload://' } };
    }
    // For 'all' or default, show everything (both downloads and uploads)

    if (fileType) {
      where.fileType = fileType;
    }

    if (query) {
      where.OR = [
        {
          originalUrl: {
            contains: query,
            mode: 'insensitive',
          }
        },
        {
          trend: {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          }
        },
      ];
    }

    if (platform) {
      where.trend = {
        platform,
      };
    }

    console.log('Where clause:', JSON.stringify(where, null, 2));

    const downloads = await db.mediaDownload.findMany({
      where,
      include: {
        trend: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    console.log(`Found ${downloads.length} archived downloads for user ${user.id}`);

    // Get total count for pagination
    const total = await db.mediaDownload.count({
      where,
    });

    console.log(`Total archived downloads: ${total}`);

    const response = createPaginatedResponse(downloads, page, limit, total);
    return createSuccessResponse(response.data, response.meta);
  } catch (error) {
    console.error('Get library error:', error);
    return createInternalServerError('Failed to get library content');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));