import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    
    return NextResponse.json({
      success: true,
      data: {
        userId: userId || 'anonymous',
        timestamp: new Date().toISOString(),
        headers: Object.fromEntries(req.headers.entries()),
      }
    });
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}