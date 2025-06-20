import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/redis-dev';
import { apifyService, ScrapedContent } from '@/services/apify-service';
import {
  createSuccessResponse,
  createForbiddenError,
  createInternalServerError,
  withErrorHandling,
  withRateLimit
} from '@/lib/api-utils';

// Internal authentication for cron jobs
function withCronAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken) {
      console.error('CRON_SECRET_TOKEN not set in environment');
      return createForbiddenError('Cron authentication not configured');
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return createForbiddenError('Invalid cron authentication token');
    }
    
    return await handler(req);
  };
}

async function handlePOST(req: NextRequest) {
  try {
    const startTime = Date.now();
    console.log('Starting scheduled trend scraping job');

    // Get active users who have subscriptions and recent activity
    const activeUsers = await db.user.findMany({
      where: {
        subscription: {
          status: 'active',
        },
        trends: {
          some: {
            scrapedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        },
      },
      include: {
        subscription: true,
      },
      take: 50, // Limit to prevent overwhelming the system
    });

    console.log(`Found ${activeUsers.length} active users for trend scraping`);

    const results = {
      totalUsers: activeUsers.length,
      successfulScrapes: 0,
      failedScrapes: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const user of activeUsers) {
      try {
        // Get user's recent trend keywords for automatic scraping
        const recentTrends = await db.trend.findMany({
          where: {
            userId: user.id,
            scrapedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: {
            views: 'desc',
          },
          take: 3,
        });

        if (recentTrends.length === 0) {
          continue;
        }

        // Extract popular hashtags from recent trends
        const popularHashtags = recentTrends
          .flatMap(trend => trend.hashtags)
          .filter(Boolean)
          .slice(0, 5);

        if (popularHashtags.length === 0) {
          continue;
        }

        // Create background job for trend scraping
        const job = await db.backgroundJob.create({
          data: {
            userId: user.id,
            jobType: 'trend_scrape',
            jobData: {
              platform: 'youtube', // Default to YouTube for scheduled scraping
              keywords: popularHashtags,
              limit: 10,
              automated: true,
            },
            status: 'pending',
            scheduledAt: new Date(),
          },
        });

        console.log(`Created trend scraping job ${job.id} for user ${user.id}`);

        // Process the job immediately (in production, this would be handled by a job queue)
        try {
          await db.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'processing',
              startedAt: new Date(),
            },
          });

          // Scrape trends using Apify service
          const scrapeResults = await apifyService.scrapeYouTube({
            searchTerms: popularHashtags,
            maxResults: 10,
          });

          // Save scraped trends to database
          if (scrapeResults.length > 0) {
            await db.trend.createMany({
              data: scrapeResults.map((trend: ScrapedContent) => ({
                userId: user.id,
                platform: trend.platform,
                contentType: trend.contentType,
                title: trend.title,
                description: trend.description,
                url: trend.url,
                thumbnailUrl: trend.thumbnailUrl,
                author: trend.author,
                likes: trend.likes,
                views: trend.views,
                shares: trend.shares,
                comments: trend.comments,
                hashtags: trend.hashtags,
                metadata: trend.metadata,
                scrapedAt: new Date(),
              })),
            });
          }

          // Mark job as completed
          await db.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
            },
          });

          results.successfulScrapes++;
          console.log(`Successfully scraped ${scrapeResults.length} trends for user ${user.id}`);
        } catch (jobError) {
          console.error(`Error processing job ${job.id}:`, jobError);
          
          await db.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'failed',
              errorMessage: jobError instanceof Error ? jobError.message : 'Unknown error',
              completedAt: new Date(),
            },
          });

          results.failedScrapes++;
          results.errors.push(`User ${user.id}: ${jobError instanceof Error ? jobError.message : 'Unknown error'}`);
        }

        // Rate limiting: wait between users to avoid overwhelming external services
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        results.failedScrapes++;
        results.errors.push(`User ${user.id}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Trend scraping job completed in ${duration}ms:`, results);

    // Cache the results for monitoring
    await cache.set(
      'cron:scrape-trends:last-run',
      {
        timestamp: new Date().toISOString(),
        duration,
        ...results,
      },
      3600 // 1 hour TTL
    );

    return createSuccessResponse({
      message: 'Scheduled trend scraping completed',
      duration,
      results,
    });
  } catch (error) {
    console.error('Scheduled trend scraping error:', error);
    
    // Cache the error for monitoring
    await cache.set(
      'cron:scrape-trends:last-error',
      {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      3600 // 1 hour TTL
    );

    return createInternalServerError('Failed to execute scheduled trend scraping');
  }
}

export const POST = withErrorHandling(
  withRateLimit(10, 60)( // Limit to 10 requests per minute
    withCronAuth(handlePOST)
  )
);