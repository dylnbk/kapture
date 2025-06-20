import { NextRequest } from 'next/server';
import { billingService, UsageQuota } from '@/services/billing-service';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-dev';
import {
  createSuccessResponse,
  createInternalServerError,
  withErrorHandling,
  withAuth
} from '@/lib/api-utils';

async function handleGET(req: NextRequest, user: any) {
  try {
    // Check cache first for performance
    const cacheKey = CACHE_KEYS.USER_USAGE(user.id, getCurrentPeriod());
    const cachedUsage = await cache.get<UsageQuota>(cacheKey);
    
    if (cachedUsage) {
      return createSuccessResponse(cachedUsage, {
        usage: {
          current: cachedUsage.scrapeRequests.current + cachedUsage.downloads.current + cachedUsage.aiGenerations.current,
          limit: cachedUsage.scrapeRequests.limit + cachedUsage.downloads.limit + cachedUsage.aiGenerations.limit,
          remaining: (cachedUsage.scrapeRequests.limit - cachedUsage.scrapeRequests.current) +
                    (cachedUsage.downloads.limit - cachedUsage.downloads.current) +
                    (cachedUsage.aiGenerations.limit - cachedUsage.aiGenerations.current)
        }
      });
    }

    // Get fresh usage data
    const usage = await billingService.getUserUsage(user.id);
    
    // Calculate totals for meta
    const totalCurrent = usage.scrapeRequests.current + usage.downloads.current + usage.aiGenerations.current;
    const totalLimit = usage.scrapeRequests.limit + usage.downloads.limit + usage.aiGenerations.limit;
    const totalRemaining = totalLimit - totalCurrent;
    
    return createSuccessResponse(usage, {
      usage: {
        current: totalCurrent,
        limit: totalLimit,
        remaining: totalRemaining
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return createInternalServerError('Failed to get usage data');
  }
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const GET = withErrorHandling(withAuth(handleGET));