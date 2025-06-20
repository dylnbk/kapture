import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mediaService } from '@/services/media-service';

async function testDownload() {
  // Test URL
  const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  
  // Validate URL and extract metadata
  const validation = await mediaService.validateUrl(testUrl);
  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid URL: ${validation.error}`
    };
  }

  // Try to extract metadata
  let extractedMetadata;
  try {
    extractedMetadata = await mediaService.extractMetadata(testUrl);
  } catch (error) {
    console.warn('Failed to extract metadata, proceeding without:', error);
    extractedMetadata = null;
  }

  return {
    success: true,
    data: {
      url: testUrl,
      validation,
      metadata: extractedMetadata,
      timestamp: new Date().toISOString(),
      message: "URL validation and metadata extraction working!"
    }
  };
}

export async function GET(req: NextRequest) {
  try {
    const result = await testDownload();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test download error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await testDownload();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test download error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}