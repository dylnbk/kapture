import { NextRequest } from 'next/server';
import { db, getUserTrends } from '@/lib/db';
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
    const platform = params.platform as string;
    const offset = (page - 1) * limit;

    const trends = await getUserTrends(user.id, {
      platform,
      limit,
      offset,
    });

    // Get total count for pagination
    const total = await db.trend.count({
      where: {
        userId: user.id,
        ...(platform && { platform }),
      },
    });

    const response = createPaginatedResponse(trends, page, limit, total);
    return createSuccessResponse(response.data, response.meta);
  } catch (error) {
    console.error('Get trends error:', error);
    return createInternalServerError('Failed to get trends');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));