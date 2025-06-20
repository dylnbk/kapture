import { NextRequest } from 'next/server';
import { db, incrementUserUsage } from '@/lib/db';
import { apifyService } from '@/services/apify-service';
import { trendScrapeSchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation,
  withUsageValidation 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    // Scrape trends based on platform
    let scrapedContent;
    const { platform, keywords, limit, filters } = data;

    switch (platform) {
      case 'youtube':
        scrapedContent = await apifyService.scrapeYouTube({
          searchTerms: keywords,
          maxResults: limit,
          language: filters?.language,
          publishedAfter: filters?.dateRange ? getDateFromRange(filters.dateRange) : undefined,
        });
        break;
      
      case 'tiktok':
        scrapedContent = await apifyService.scrapeTikTok({
          searchTerms: keywords,
          maxResults: limit,
          language: filters?.language,
        });
        break;
      
      case 'reddit':
        scrapedContent = await apifyService.scrapeReddit({
          subreddits: ['all'], // Could be made configurable
          searchTerms: keywords,
          maxResults: limit,
          timeframe: filters?.dateRange === '1d' ? 'day' : 'week',
        });
        break;
      
      case 'twitter':
        scrapedContent = await apifyService.scrapeTwitter({
          searchTerms: keywords,
          maxResults: limit,
          language: filters?.language,
        });
        break;
      
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Filter by minimum views if specified
    if (filters?.minViews) {
      scrapedContent = scrapedContent.filter(content => content.views >= filters.minViews);
    }

    // Store trends in database
    const savedTrends = await Promise.all(
      scrapedContent.map(content => 
        db.trend.create({
          data: {
            userId: user.id,
            platform: content.platform,
            contentType: content.contentType,
            title: content.title,
            description: content.description,
            url: content.url,
            thumbnailUrl: content.thumbnailUrl,
            author: content.author,
            likes: content.likes,
            views: content.views,
            shares: content.shares,
            comments: content.comments,
            hashtags: content.hashtags,
            metadata: content.metadata,
            scrapedAt: content.scrapedAt,
          },
        })
      )
    );

    // Increment usage counter
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    await incrementUserUsage(user.id, 'scrape', periodStart, periodEnd, savedTrends.length);

    return createSuccessResponse({
      trends: savedTrends,
      scrapedCount: savedTrends.length,
      platform,
      keywords,
    });
  } catch (error) {
    console.error('Scrape trends error:', error);
    return createInternalServerError('Failed to scrape trends');
  }
}

function getDateFromRange(range: string): string {
  const now = new Date();
  switch (range) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export const POST = withErrorHandling(withAuth(withUsageValidation('scrape')(withValidation(trendScrapeSchema)(handlePOST))));