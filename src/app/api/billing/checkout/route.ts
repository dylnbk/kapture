import { NextRequest } from 'next/server';
import { billingService } from '@/services/billing-service';
import { checkoutSessionSchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    const session = await billingService.createCheckoutSession(
      user.id,
      data.priceId,
      data.successUrl,
      data.cancelUrl
    );
    
    return createSuccessResponse(session);
  } catch (error) {
    console.error('Checkout creation error:', error);
    return createInternalServerError('Failed to create checkout session');
  }
}

export const POST = withErrorHandling(withAuth(withValidation(checkoutSessionSchema)(handlePOST)));