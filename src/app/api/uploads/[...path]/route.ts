import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { 
  createNotFoundError, 
  createForbiddenError,
  withErrorHandling,
  withAuth 
} from '@/lib/api-utils';

async function handleGET(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').slice(3); // Remove '', 'api', 'uploads'
    const filePath = pathSegments.join('/');
    
    console.log('Upload API Debug:', {
      url: req.url,
      pathSegments,
      filePath,
      userId: user.id
    });
    
    if (!filePath) {
      return createNotFoundError('File path not specified');
    }

    // Security: Ensure the path doesn't contain dangerous characters
    if (filePath.includes('..') || filePath.includes('\\..\\')) {
      return createForbiddenError('Invalid file path');
    }

    // Check if user owns this file by checking the database
    // Extract user ID from the file path (first segment should be user ID)
    const userIdFromPath = pathSegments[0];
    console.log('User ID check:', { userIdFromPath, actualUserId: user.id });
    
    if (userIdFromPath !== user.id) {
      return createForbiddenError('Access denied');
    }

    // Verify file exists in database
    const mediaDownload = await db.mediaDownload.findFirst({
      where: {
        userId: user.id,
        storageKey: filePath,
      },
    });

    console.log('Database lookup:', {
      searchKey: filePath,
      found: !!mediaDownload,
      actualStorageKey: mediaDownload?.storageKey
    });

    if (!mediaDownload) {
      return createNotFoundError('File not found in library');
    }

    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath);
    
    console.log('File serving attempt:', {
      fullPath,
      exists: await stat(fullPath).then(() => true).catch(() => false)
    });
    
    try {
      // Check if file exists
      const fileStats = await stat(fullPath);
      if (!fileStats.isFile()) {
        console.log('File is not a file:', fullPath);
        return createNotFoundError('File not found');
      }

      console.log('File stats:', { size: fileStats.size, isFile: fileStats.isFile() });

      // Read the file
      const fileBuffer = await readFile(fullPath);
      
      // Determine content type from file extension or metadata
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.csv': 'text/csv',
      };
      
      contentType = contentTypeMap[ext] || contentType;
      
      // Use metadata content type if available
      if (mediaDownload.metadata && (mediaDownload.metadata as any).mimeType) {
        contentType = (mediaDownload.metadata as any).mimeType;
      }

      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Length', fileStats.size.toString());
      headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      headers.set('Accept-Ranges', 'bytes'); // Enable range requests for video
      
      // Set content disposition for downloads
      const fileName = (mediaDownload.metadata as any)?.originalName || path.basename(filePath);
      headers.set('Content-Disposition', `inline; filename="${fileName}"`);

      // Add CORS headers for video playback
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Range');

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
      
    } catch (fileError) {
      console.error('File serving error:', fileError);
      return createNotFoundError('File not accessible');
    }
    
  } catch (error) {
    console.error('Upload serving error:', error);
    return createNotFoundError('File not found');
  }
}

async function handleOPTIONS(req: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  
  return new NextResponse(null, {
    status: 200,
    headers,
  });
}

export const GET = withErrorHandling(withAuth(handleGET));
export const OPTIONS = handleOPTIONS;