import { NextRequest } from 'next/server';
import { billingService } from '@/services/billing-service';
import {
  createSuccessResponse,
  createInternalServerError,
  withErrorHandling
} from '@/lib/api-utils';

async function handleGET(req: NextRequest) {
  try {
    // Get subscription plans (static data, no caching needed)
    const plans = await billingService.getSubscriptionPlans();
    
    return createSuccessResponse(plans);
  } catch (error) {
    console.error('Get subscription plans error:', error);
    return createInternalServerError('Failed to get subscription plans');
  }
}

// Public endpoint - no authentication required
export const GET = withErrorHandling(handleGET);