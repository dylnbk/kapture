import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getQueryParams, createPaginatedResponse } from '@/lib/api-utils';
import { librarySearchSchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createInternalServerError,
  createValidationError,
  withErrorHandling,
  withAuth 
} from '@/lib/api-utils';
import { z } from 'zod';

async function handleGET(req: NextRequest, user: any) {
  try {
    const params = getQueryParams(req);
    
    // Validate query parameters
    const validationResult = librarySearchSchema.safeParse({
      query: params.query,
      fileType: params.fileType,
      platform: params.platform,
      dateRange: params.dateRange,
      page: parseInt(params.page as string) || 1,
      limit: parseInt(params.limit as string) || 10,
    });

    if (!validationResult.success) {
      return createValidationError(validationResult.error);
    }

    const { query, fileType, platform, dateRange, page, limit } = validationResult.data;
    const offset = (page - 1) * limit;

    // Build base where clause
    const where: any = {
      userId: user.id,
      downloadStatus: 'completed',
    };

    // Add file type filter
    if (fileType) {
      where.fileType = fileType;
    }

    // Add date range filter
    if (dateRange) {
      const now = new Date();
      let dateThreshold: Date;
      
      switch (dateRange) {
        case '1d':
          dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = new Date(0);
      }
      
      where.createdAt = {
        gte: dateThreshold,
      };
    }

    // Build search conditions with relevance scoring
    const searchConditions: any[] = [];
    
    if (query) {
      // Search in trend-related fields
      searchConditions.push({
        trend: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { author: { contains: query, mode: 'insensitive' } },
            { hashtags: { has: query } },
          ],
        },
      });

      // Search in metadata (JSON field)
      searchConditions.push({
        metadata: {
          path: ['title'],
          string_contains: query,
        },
      });

      searchConditions.push({
        metadata: {
          path: ['description'],
          string_contains: query,
        },
      });
    }

    // Add platform filter
    if (platform) {
      if (searchConditions.length > 0) {
        where.AND = [
          { OR: searchConditions },
          { trend: { platform } },
        ];
      } else {
        where.trend = { platform };
      }
    } else if (searchConditions.length > 0) {
      where.OR = searchConditions;
    }

    // Execute search query with relevance-based ordering
    const downloads = await db.mediaDownload.findMany({
      where,
      include: {
        trend: {
          select: {
            id: true,
            platform: true,
            contentType: true,
            title: true,
            description: true,
            url: true,
            thumbnailUrl: true,
            author: true,
            likes: true,
            views: true,
            shares: true,
            comments: true,
            hashtags: true,
            scrapedAt: true,
          },
        },
      },
      orderBy: [
        // Prioritize by views/popularity if available
        { trend: { views: 'desc' } },
        // Then by creation date (most recent first)
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await db.mediaDownload.count({
      where,
    });

    // Calculate relevance scores and sort results
    const resultsWithRelevance = downloads.map(download => {
      let relevanceScore = 0;
      
      if (query && download.trend) {
        const queryLower = query.toLowerCase();
        const trend = download.trend;
        
        // Title match gets highest score
        if (trend.title?.toLowerCase().includes(queryLower)) {
          relevanceScore += 10;
        }
        
        // Author match gets medium score
        if (trend.author?.toLowerCase().includes(queryLower)) {
          relevanceScore += 5;
        }
        
        // Description match gets lower score
        if (trend.description?.toLowerCase().includes(queryLower)) {
          relevanceScore += 3;
        }
        
        // Hashtag exact match gets high score
        if (trend.hashtags?.some(tag => tag.toLowerCase() === queryLower)) {
          relevanceScore += 8;
        }
        
        // Hashtag partial match gets medium score
        if (trend.hashtags?.some(tag => tag.toLowerCase().includes(queryLower))) {
          relevanceScore += 4;
        }
        
        // Boost score based on engagement metrics
        if (trend.views && trend.views > 10000) relevanceScore += 2;
        if (trend.likes && trend.likes > 1000) relevanceScore += 1;
      }
      
      return {
        ...download,
        relevanceScore,
      };
    });

    // Sort by relevance score if we have a query, otherwise maintain original order
    if (query) {
      resultsWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    const response = createPaginatedResponse(resultsWithRelevance, page, limit, total);
    
    return createSuccessResponse({
      results: response.data,
      searchInfo: {
        query,
        fileType,
        platform,
        dateRange,
        hasRelevanceScoring: !!query,
      },
    }, response.meta);
  } catch (error) {
    console.error('Library search error:', error);
    return createInternalServerError('Failed to search library content');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));