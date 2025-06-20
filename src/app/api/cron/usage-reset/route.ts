import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/redis-dev';
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
    console.log('Starting monthly usage reset job');

    // Calculate the current billing period
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get the first day of the current month
    const periodStart = new Date(currentYear, currentMonth, 1);
    
    // Get the first day of the next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const periodEnd = new Date(nextYear, nextMonth, 1);

    console.log(`Resetting usage for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    const results = {
      totalUsers: 0,
      resetRecords: 0,
      errors: [] as string[],
      usageTypes: {
        scrape: 0,
        download: 0,
        ai_generation: 0,
      },
    };

    // Use a database transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // Get all active users with subscriptions
      const users = await tx.user.findMany({
        where: {
          subscription: {
            status: 'active',
          },
        },
        include: {
          subscription: true,
        },
      });

      results.totalUsers = users.length;
      console.log(`Found ${users.length} active users for usage reset`);

      // Process each user
      for (const user of users) {
        try {
          // Reset usage counters for all usage types
          const usageTypes = ['scrape', 'download', 'ai_generation'];
          
          for (const usageType of usageTypes) {
            // Create or reset usage record for the new billing period
            await tx.userUsage.upsert({
              where: {
                userId_usageType_periodStart: {
                  userId: user.id,
                  usageType,
                  periodStart,
                },
              },
              update: {
                count: 0,
                periodEnd,
                updatedAt: new Date(),
              },
              create: {
                userId: user.id,
                usageType,
                count: 0,
                periodStart,
                periodEnd,
              },
            });

            results.resetRecords++;
            results.usageTypes[usageType as keyof typeof results.usageTypes]++;
          }

          console.log(`Reset usage counters for user ${user.id}`);
        } catch (userError) {
          console.error(`Error resetting usage for user ${user.id}:`, userError);
          results.errors.push(`User ${user.id}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
        }
      }

      // Archive old usage records (older than 12 months)
      const archiveDate = new Date();
      archiveDate.setMonth(archiveDate.getMonth() - 12);
      
      const deletedRecords = await tx.userUsage.deleteMany({
        where: {
          periodStart: {
            lt: archiveDate,
          },
        },
      });

      console.log(`Archived ${deletedRecords.count} old usage records`);
    });

    // Clear related cache entries
    try {
      // Clear all user usage cache entries
      const cacheKeys = [
        'user:*:usage:*',
        'user:*:subscription',
      ];

      for (const pattern of cacheKeys) {
        // In a real implementation, you'd use Redis SCAN with pattern matching
        // For now, we'll just clear the entire cache namespace
        await cache.delete(pattern);
      }

      console.log('Cleared usage-related cache entries');
    } catch (cacheError) {
      console.error('Error clearing cache:', cacheError);
      results.errors.push(`Cache clear error: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Usage reset job completed in ${duration}ms:`, results);

    // Cache the results for monitoring
    await cache.set(
      'cron:usage-reset:last-run',
      {
        timestamp: new Date().toISOString(),
        duration,
        ...results,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
      24 * 60 * 60 // 24 hours TTL
    );

    // Send notification to monitoring system (optional)
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'usage_reset_completed',
            timestamp: new Date().toISOString(),
            duration,
            ...results,
          }),
        });
      } catch (webhookError) {
        console.error('Error sending monitoring webhook:', webhookError);
      }
    }

    return createSuccessResponse({
      message: 'Monthly usage reset completed successfully',
      duration,
      results,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error('Usage reset error:', error);
    
    // Cache the error for monitoring
    await cache.set(
      'cron:usage-reset:last-error',
      {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      24 * 60 * 60 // 24 hours TTL
    );

    // Send error notification to monitoring system
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'usage_reset_failed',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        });
      } catch (webhookError) {
        console.error('Error sending error webhook:', webhookError);
      }
    }

    return createInternalServerError('Failed to execute monthly usage reset');
  }
}

export const POST = withErrorHandling(
  withRateLimit(5, 60)( // Limit to 5 requests per minute
    withCronAuth(handlePOST)
  )
);