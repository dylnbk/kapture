import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { localStorageService } from '@/services/local-storage-service';
import {
  createSuccessResponse,
  createInternalServerError,
  createValidationError,
  withErrorHandling,
  withAuth,
  withUsageValidation
} from '@/lib/api-utils';

// Helper function to determine file type from MIME type
function getFileTypeFromMimeType(mimeType: string): 'video' | 'audio' | 'image' | 'document' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}

// Helper function to get content type for storage
function getStorageContentType(mimeType: string): string {
  // Map common file types to appropriate content types
  const typeMap: Record<string, string> = {
    'application/pdf': 'application/pdf',
    'application/msword': 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain': 'text/plain',
    'text/csv': 'text/csv',
  };
  
  return typeMap[mimeType] || mimeType;
}

async function handlePOST(req: NextRequest, user: any) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return createValidationError({
        issues: [{ message: 'No files provided', path: ['files'] }]
      } as any);
    }

    // Validate file count (max 10 files at once)
    if (files.length > 10) {
      return createValidationError({
        issues: [{ message: 'Maximum 10 files allowed per upload', path: ['files'] }]
      } as any);
    }

    const uploadResults = [];
    const maxFileSize = 100 * 1024 * 1024; // 100MB per file

    for (const file of files) {
      // Validate file size
      if (file.size > maxFileSize) {
        return createValidationError({
          issues: [{ message: `File "${file.name}" exceeds maximum size of 100MB`, path: ['files'] }]
        } as any);
      }

      // Validate file type
      const allowedTypes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Videos
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
        // Documents
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv', 'text/markdown'
      ];

      if (!allowedTypes.includes(file.type)) {
        return createValidationError({
          issues: [{ message: `File type "${file.type}" is not supported`, path: ['files'] }]
        } as any);
      }

      try {
        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Upload to storage
        const uploadResult = await localStorageService.uploadFile(
          user.id,
          buffer,
          file.name,
          {
            contentType: getStorageContentType(file.type),
            metadata: {
              originalName: file.name,
              uploadedBy: user.id,
              uploadedAt: new Date().toISOString(),
              fileType: getFileTypeFromMimeType(file.type),
            }
          }
        );

        // Create database record
        const mediaDownload = await db.mediaDownload.create({
          data: {
            userId: user.id,
            originalUrl: `upload://${file.name}`, // Special URL format for uploads
            storageUrl: uploadResult.url,
            storageKey: uploadResult.key,
            fileType: getFileTypeFromMimeType(file.type) === 'document' ? 'image' : getFileTypeFromMimeType(file.type), // Map document to image for schema compatibility
            fileSize: file.size,
            metadata: {
              title: file.name,
              originalName: file.name,
              mimeType: file.type,
              uploadedAt: new Date().toISOString(),
              isUpload: true,
              platform: 'upload',
              actualFileType: getFileTypeFromMimeType(file.type), // Store actual type
            },
            downloadStatus: 'completed',
            keepFile: true, // Uploaded files are always kept
          },
        });

        uploadResults.push({
          id: mediaDownload.id,
          filename: file.name,
          size: file.size,
          type: file.type,
          storageUrl: uploadResult.url,
          status: 'completed'
        });

        console.log(`File uploaded successfully: ${file.name} (${file.size} bytes)`);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        uploadResults.push({
          filename: file.name,
          size: file.size,
          type: file.type,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    // Check if any uploads succeeded
    const successfulUploads = uploadResults.filter(r => r.status === 'completed');
    const failedUploads = uploadResults.filter(r => r.status === 'failed');

    return createSuccessResponse({
      uploaded: successfulUploads,
      failed: failedUploads,
      total: files.length,
      successful: successfulUploads.length,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return createInternalServerError('Failed to process file upload');
  }
}

export const POST = withErrorHandling(withAuth(withUsageValidation('download')(handlePOST)));