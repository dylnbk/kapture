import { NextRequest } from 'next/server';
import { getCurrentUser, syncUserWithClerk } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  createSuccessResponse,
  createUnauthorizedError,
  createInternalServerError,
  withErrorHandling
} from '@/lib/api-utils';

async function handleGET(req: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    return createUnauthorizedError();
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
}

async function handleDELETE(req: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    return createUnauthorizedError();
  }

  try {
    // In a real implementation, you would also handle Clerk user deletion
    // and cleanup associated data (subscriptions, files, etc.)
    await db.user.delete({
      where: { id: user.id },
    });

    return createSuccessResponse({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    return createInternalServerError('Failed to delete user');
  }
}

export const GET = withErrorHandling(handleGET);
export const DELETE = withErrorHandling(handleDELETE);