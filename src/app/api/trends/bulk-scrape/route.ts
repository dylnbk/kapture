import { NextRequest } from 'next/server';
import { db, incrementUserUsage } from '@/lib/db';
import { apifyService } from '@/services/apify-service';
import { bulkScrapeSchema } from '@/lib/validation';
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
    const { platforms, keywords, limit } = data;
    const allScrapedContent: any[] = [];
    const platformResults: Record<string, any> = {};

    // Scrape each platform sequentially to avoid overwhelming external APIs
    for (const platform of platforms) {
      try {
        let scrapedContent;

        switch (platform) {
          case 'youtube':
            scrapedContent = await apifyService.scrapeYouTube({
              searchTerms: keywords,
              maxResults: limit,
            });
            break;
          
          case 'tiktok':
            scrapedContent = await apifyService.scrapeTikTok({
              searchTerms: keywords,
              maxResults: limit,
            });
            break;
          
          case 'reddit':
            scrapedContent = await apifyService.scrapeReddit({
              subreddits: ['all'],
              searchTerms: keywords,
              maxResults: limit,
              timeframe: 'week',
            });
            break;
          
          case 'twitter':
            scrapedContent = await apifyService.scrapeTwitter({
              searchTerms: keywords,
              maxResults: limit,
            });
            break;
          
          default:
            console.warn(`Unsupported platform: ${platform}`);
            continue;
        }

        allScrapedContent.push(...scrapedContent);
        platformResults[platform] = {
          count: scrapedContent.length,
          status: 'success',
        };

      } catch (platformError) {
        console.error(`Error scraping ${platform}:`, platformError);
        platformResults[platform] = {
          count: 0,
          status: 'failed',
          error: platformError instanceof Error ? platformError.message : 'Unknown error',
        };
      }
    }

    // Store all trends in database using a transaction
    const savedTrends = await db.$transaction(async (tx) => {
      const trends = await Promise.all(
        allScrapedContent.map(content => 
          tx.trend.create({
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

      return trends;
    });

    // Increment usage counter
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    await incrementUserUsage(user.id, 'scrape', periodStart, periodEnd, savedTrends.length);

    // Calculate success/failure statistics
    const successfulPlatforms = platforms.filter((p: string) => platformResults[p]?.status === 'success');
    const failedPlatforms = platforms.filter((p: string) => platformResults[p]?.status === 'failed');

    return createSuccessResponse({
      trends: savedTrends,
      totalScraped: savedTrends.length,
      platforms: platformResults,
      summary: {
        requestedPlatforms: platforms.length,
        successfulPlatforms: successfulPlatforms.length,
        failedPlatforms: failedPlatforms.length,
        keywords,
        limit,
      },
    });
  } catch (error) {
    console.error('Bulk scrape trends error:', error);
    return createInternalServerError('Failed to perform bulk scraping');
  }
}

export const POST = withErrorHandling(withAuth(withUsageValidation('scrape')(withValidation(bulkScrapeSchema)(handlePOST))));