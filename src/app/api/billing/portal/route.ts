import { NextRequest } from 'next/server';
import { billingService } from '@/services/billing-service';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, user: any) {
  try {
    const portalUrl = await billingService.createPortalSession(user.id);
    
    return createSuccessResponse({
      url: portalUrl,
    });
  } catch (error) {
    console.error('Portal session creation error:', error);
    
    if (error instanceof Error && error.message.includes('No subscription found')) {
      return createInternalServerError('No active subscription found');
    }
    
    return createInternalServerError('Failed to create portal session');
  }
}

export const POST = withErrorHandling(withAuth(handlePOST));