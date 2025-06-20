import { NextRequest } from 'next/server';
import { billingService } from '@/services/billing-service';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return createInternalServerError('Missing stripe signature');
    }

    await billingService.handleWebhook(body, signature);
    
    return createSuccessResponse({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return createInternalServerError('Webhook handling failed');
  }
}

export const POST = withErrorHandling(handlePOST);