import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserByClerkId, createUser } from "./db";
import type { User } from "@prisma/client";

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return null;
    }

    let user = await getUserByClerkId(userId);
    
    // If user doesn't exist in database, try to sync with Clerk
    if (!user) {
      console.log(`User ${userId} not found in database, attempting to sync from Clerk...`);
      await syncUserWithClerk();
      // Fetch the user again after syncing to get full user with subscription
      user = await getUserByClerkId(userId);
    }
    
    return user;
  } catch (error) {
    // Provide helpful error message for database setup issues
    if (error instanceof Error && error.message.includes('database credentials')) {
      console.error('❌ Database connection failed. Please check your DATABASE_URL in .env.local');
      console.error('📖 See DATABASE-SETUP.md for quick setup instructions');
      throw new Error('Database not configured. Please set up your DATABASE_URL in .env.local file.');
    }
    throw error;
  }
}

export async function syncUserWithClerk() {
  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    return null;
  }

  const existingUser = await getUserByClerkId(clerkUser.id);
  
  if (existingUser) {
    return existingUser;
  }

  // Create new user from Clerk data with race condition handling
  try {
    const newUser = await createUser({
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || undefined,
      avatarUrl: clerkUser.imageUrl || undefined,
    });
    return newUser;
  } catch (error: any) {
    // Handle race condition - if user was created by another request
    if (error.code === 'P2002' && error.meta?.target?.includes('clerk_user_id')) {
      // Try to get the user again
      const user = await getUserByClerkId(clerkUser.id);
      if (user) {
        return user;
      }
    }
    throw error;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}

export function getAuthUserId() {
  const { userId } = auth();
  return userId;
}

export async function requireAuthUserId() {
  const userId = getAuthUserId();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }
  
  return userId;
}