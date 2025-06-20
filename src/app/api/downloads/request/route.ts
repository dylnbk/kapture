import { NextRequest } from 'next/server';
import { db, incrementUserUsage } from '@/lib/db';
import { mediaService } from '@/services/media-service';
import { storageService } from '@/services/storage-service';
import { downloadRequestSchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation,
  withUsageValidation 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    const { url, fileType, quality, trendId } = data;

    // Validate URL and extract metadata
    const validation = await mediaService.validateUrl(url);
    if (!validation.valid) {
      return createInternalServerError(`Invalid URL: ${validation.error}`);
    }

    // Extract metadata upfront to get title and other info
    let extractedMetadata;
    try {
      extractedMetadata = await mediaService.extractMetadata(url);
    } catch (error) {
      console.warn('Failed to extract metadata, proceeding without:', error);
      extractedMetadata = { title: 'Media Download' };
    }

    // Request download from yt-dlp service
    const downloadJob = await mediaService.requestDownload({
      url,
      userId: user.id,
      fileType,
      quality: quality || 'highest', // Default to highest quality
      trendId,
    });

    // Create database record with the job ID from yt-dlp service and full metadata
    const mediaDownload = await db.mediaDownload.create({
      data: {
        id: downloadJob.id, // Use the job ID from yt-dlp service
        userId: user.id,
        trendId,
        originalUrl: url,
        storageUrl: '', // Will be updated when download completes
        storageKey: '', // Will be updated when download completes
        fileType: fileType || 'video',
        downloadStatus: 'pending',
        keepFile: false, // Explicitly set to false for queue visibility
        duration: extractedMetadata.duration || null,
        metadata: {
          ...extractedMetadata,
          jobId: downloadJob.id,
          quality: quality || 'highest',
          platform: validation.platform,
          requestedAt: new Date().toISOString(),
        },
      },
    });

    // Increment usage counter
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    await incrementUserUsage(user.id, 'download', periodStart, periodEnd, 1);

    return createSuccessResponse({
      download: mediaDownload,
      jobId: downloadJob.id,
      status: 'pending',
    });
  } catch (error) {
    console.error('Download request error:', error);
    return createInternalServerError('Failed to request download');
  }
}

export const POST = withErrorHandling(withAuth(withUsageValidation('download')(withValidation(downloadRequestSchema)(handlePOST))));