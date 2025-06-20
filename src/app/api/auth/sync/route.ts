import { NextRequest } from 'next/server';
import { syncUserWithClerk } from '@/lib/auth';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest) {
  try {
    const user = await syncUserWithClerk();
    
    if (!user) {
      return createInternalServerError('Failed to sync user');
    }

    return createSuccessResponse({
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('User sync error:', error);
    return createInternalServerError('Failed to sync user');
  }
}

export const POST = withErrorHandling(handlePOST);