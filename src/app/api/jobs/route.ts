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
    const status = params.status as string;
    const jobType = params.jobType as string;
    const offset = (page - 1) * limit;

    const where: any = {
      userId: user.id,
    };

    if (status) {
      where.status = status;
    }

    if (jobType) {
      where.jobType = jobType;
    }

    const jobs = await db.backgroundJob.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await db.backgroundJob.count({
      where,
    });

    const response = createPaginatedResponse(jobs, page, limit, total);
    return createSuccessResponse(response.data, response.meta);
  } catch (error) {
    console.error('Get jobs error:', error);
    return createInternalServerError('Failed to get background jobs');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));