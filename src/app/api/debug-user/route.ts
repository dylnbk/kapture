import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { billingService } from '@/services/billing-service';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = auth();
    
    if (!clerkUserId) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Check if user exists in database
    const dbUser = await db.user.findUnique({
      where: { clerkUserId },
      include: { subscription: true }
    });

    // Check billing service
    let billingInfo = null;
    let billingError = null;
    
    if (dbUser) {
      try {
        const usage = await billingService.getUserUsage(dbUser.id);
        const canDownload = await billingService.checkUsageLimit(dbUser.id, 'download');
        billingInfo = { usage, canDownload };
      } catch (error) {
        billingError = error instanceof Error ? error.message : 'Unknown billing error';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        clerkUserId,
        dbUser,
        billingInfo,
        billingError,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Debug user error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}