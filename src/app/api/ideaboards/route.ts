import { NextRequest } from 'next/server';
import { db, getUserIdeaboards } from '@/lib/db';
import { createIdeaboardSchema } from '@/lib/validation';
import { getQueryParams, createPaginatedResponse } from '@/lib/api-utils';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation 
} from '@/lib/api-utils';

async function handleGET(req: NextRequest, user: any) {
  try {
    console.log('Getting ideaboards for user:', user.id);
    const params = getQueryParams(req);
    const page = parseInt(params.page as string) || 1;
    const limit = parseInt(params.limit as string) || 10;
    const status = params.status as string;
    const offset = (page - 1) * limit;

    console.log('Query params:', { page, limit, status, offset });

    const ideaboards = await getUserIdeaboards(user.id, {
      status,
      limit,
      offset,
    });

    console.log('Ideaboards result:', ideaboards);

    // Get total count for pagination
    const total = await db.ideaboard.count({
      where: {
        userId: user.id,
        ...(status && { status }),
      },
    });

    console.log('Total count:', total);

    const response = createPaginatedResponse(ideaboards, page, limit, total);
    console.log('Final response:', response);
    return createSuccessResponse(response.data, response.meta);
  } catch (error) {
    console.error('Get ideaboards error:', error);
    return createInternalServerError('Failed to get ideaboards');
  }
}

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    const { name, description, keywords, creativity } = data;

    const ideaboard = await db.ideaboard.create({
      data: {
        userId: user.id,
        name,
        description,
        keywords: keywords || [],
        creativity: creativity || 7,
        status: 'active',
      },
    });

    return createSuccessResponse(ideaboard);
  } catch (error) {
    console.error('Create ideaboard error:', error);
    return createInternalServerError('Failed to create ideaboard');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));
export const POST = withErrorHandling(withAuth(withValidation(createIdeaboardSchema)(handlePOST)));