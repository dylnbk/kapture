import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { billingService } from '@/services/billing-service';
import { 
  createSuccessResponse, 
  createUnauthorizedError, 
  createInternalServerError,
  withErrorHandling,
  withAuth 
} from '@/lib/api-utils';

async function handleGET(req: NextRequest, user: any) {
  try {
    const subscription = await billingService.getUserSubscription(user.id);
    const usage = await billingService.getUserUsage(user.id);
    
    return createSuccessResponse({
      subscription,
      usage,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return createInternalServerError('Failed to get subscription');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));