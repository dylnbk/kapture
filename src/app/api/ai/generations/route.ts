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
    const limit = Math.min(parseInt(params.limit as string) || 10, 50); // Cap at 50
    const generationType = params.generationType as string;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    // Add generation type filter if provided
    if (generationType && ['title', 'hook', 'script', 'description', 'hashtags', 'ideaboard'].includes(generationType)) {
      where.generationType = generationType;
    }

    // Get AI generations with ideaboard data
    const generations = await db.aiGeneration.findMany({
      where,
      include: {
        ideaboard: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    // Get total count for pagination
    const total = await db.aiGeneration.count({
      where,
    });

    // Format response data
    const formattedGenerations = generations.map((generation) => ({
      id: generation.id,
      prompt: generation.prompt,
      response: generation.response,
      model: generation.model,
      tokensUsed: generation.tokensUsed,
      generationType: generation.generationType,
      createdAt: generation.createdAt,
      ideaboard: generation.ideaboard ? {
        id: generation.ideaboard.id,
        title: generation.ideaboard.title,
        description: generation.ideaboard.description,
        status: generation.ideaboard.status,
        tags: generation.ideaboard.tags,
        createdAt: generation.ideaboard.createdAt,
        updatedAt: generation.ideaboard.updatedAt,
      } : null,
    }));

    // Get usage statistics for context
    const usageStats = await db.aiGeneration.groupBy({
      by: ['generationType'],
      where: {
        userId: user.id,
      },
      _count: {
        id: true,
      },
      _sum: {
        tokensUsed: true,
      },
    });

    const stats = {
      totalGenerations: total,
      tokenUsage: usageStats.reduce((sum, stat) => sum + (stat._sum.tokensUsed || 0), 0),
      byType: usageStats.reduce((acc, stat) => {
        acc[stat.generationType] = {
          count: stat._count.id,
          tokens: stat._sum.tokensUsed || 0,
        };
        return acc;
      }, {} as Record<string, { count: number; tokens: number }>),
    };

    const paginationResponse = createPaginatedResponse(formattedGenerations, page, limit, total);
    
    // Create custom response with stats
    const responseData = {
      generations: paginationResponse.data,
      stats,
    };

    return createSuccessResponse(responseData, paginationResponse.meta);
  } catch (error) {
    console.error('Get AI generations error:', error);
    return createInternalServerError('Failed to get AI generations');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));