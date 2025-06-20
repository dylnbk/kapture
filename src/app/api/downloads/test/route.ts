import { NextRequest } from 'next/server';
import { mediaService } from '@/services/media-service';
import { createSuccessResponse, createInternalServerError } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing download API without auth...');
    
    const body = await req.json();
    const { url } = body;
    
    if (!url) {
      return createInternalServerError('URL is required');
    }
    
    console.log('📥 Testing URL:', url);
    
    // Test URL validation
    const validation = await mediaService.validateUrl(url);
    console.log('✅ URL validation result:', validation);
    
    if (!validation.valid) {
      return createInternalServerError(`Invalid URL: ${validation.error}`);
    }
    
    // Test download request
    console.log('🚀 Requesting download from yt-dlp service...');
    const downloadJob = await mediaService.requestDownload({
      url,
      userId: 'test-user',
      fileType: 'video',
      quality: 'high',
    });
    
    console.log('✅ Download job created:', downloadJob);
    
    return createSuccessResponse({
      message: 'Test successful!',
      validation,
      downloadJob,
    });
    
  } catch (error) {
    console.error('❌ Test API error:', error);
    return createInternalServerError(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}