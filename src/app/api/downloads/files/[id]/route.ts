import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  createNotFoundError,
  createForbiddenError,
  createInternalServerError,
  withErrorHandling,
  withAuth,
  validateUUID
} from '@/lib/api-utils';
import { getCurrentUser } from '@/lib/auth';

async function handleGET(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id || !validateUUID(id)) {
      return new NextResponse('Invalid download ID', { status: 404 });
    }

    // Get download from database to check ownership and status
    const download = await db.mediaDownload.findUnique({
      where: { id },
    });

    if (!download) {
      return new NextResponse('Download not found', { status: 404 });
    }

    // Check ownership
    if (download.userId !== user.id) {
      return new NextResponse('Access denied', { status: 403 });
    }

    // Check if download is completed and file exists
    if (download.downloadStatus !== 'completed') {
      return new NextResponse('Download not completed', { status: 404 });
    }

    if (!download.storageUrl) {
      return new NextResponse('File not available', { status: 404 });
    }

    // Check if file has been cleaned up
    const isFileCleaned = !download.keepFile && 
      download.fileCleanupAt && 
      new Date(download.fileCleanupAt) <= new Date();

    if (isFileCleaned) {
      return new NextResponse('File has been cleaned up', { status: 404 });
    }

    try {
      // Proxy the download from yt-dlp service
      const ytdlpServiceUrl = process.env.YTDLP_SERVICE_URL || 'http://localhost:3001';
      const response = await fetch(`${ytdlpServiceUrl}/download/${id}/files`);
      
      if (!response.ok) {
        throw new Error('Failed to get file list from yt-dlp service');
      }

      const fileData = await response.json();
      
      if (!fileData.files || fileData.files.length === 0) {
        return new NextResponse('No files available for download', { status: 404 });
      }

      // Filter out .json files and get the first media file (video/audio)
      const mediaFiles = fileData.files.filter((file: any) =>
        !file.name.endsWith('.json') &&
        !file.name.endsWith('.info.json') &&
        (file.name.endsWith('.mp4') ||
         file.name.endsWith('.webm') ||
         file.name.endsWith('.mkv') ||
         file.name.endsWith('.mp3') ||
         file.name.endsWith('.m4a') ||
         file.name.endsWith('.ogg'))
      );

      if (mediaFiles.length === 0) {
        return new NextResponse('No media files available for download', { status: 404 });
      }

      const file = mediaFiles[0];
      
      // Stream the file from yt-dlp service
      // Ensure proper URL construction without double encoding
      const fileUrl = `${ytdlpServiceUrl}/download/${id}/file/${encodeURIComponent(file.name)}`;
      console.log('Main app: Fetching file from yt-dlp service:', fileUrl);
      
      const fileResponse = await fetch(fileUrl);
      
      console.log('Main app: File response status:', fileResponse.status, fileResponse.statusText);
      console.log('Main app: File response headers:', Object.fromEntries(fileResponse.headers.entries()));
      
      if (!fileResponse.ok) {
        const errorText = await fileResponse.text();
        console.error('Main app: Failed to download file from yt-dlp service:', {
          status: fileResponse.status,
          statusText: fileResponse.statusText,
          error: errorText
        });
        throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText} - ${errorText}`);
      }

      // Check if the response body is actually the file or an error
      const contentType = fileResponse.headers.get('content-type');
      console.log('Main app: Received content-type:', contentType);
      
      // Only check for JSON error responses (yt-dlp service now returns plain text errors with proper HTTP status codes)
      if (contentType && contentType.includes('application/json')) {
        const errorData = await fileResponse.json();
        console.error('Main app: Received JSON error instead of file:', errorData);
        throw new Error('Received JSON error response instead of file');
      }

      // Create response with proper headers
      const headers = new Headers();
      const downloadFilename = file.displayName || file.name;
      headers.set('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      headers.set('Content-Type', 'application/octet-stream');
      
      // Copy content-length if available
      const contentLength = fileResponse.headers.get('content-length');
      if (contentLength) {
        headers.set('Content-Length', contentLength);
      }

      console.log('Main app: Returning file response with headers:', Object.fromEntries(headers.entries()));

      return new NextResponse(fileResponse.body, {
        status: 200,
        headers,
      });
      
    } catch (error) {
      console.error('File serving error:', error);
      return new NextResponse('Failed to serve file', { status: 500 });
    }
  } catch (error) {
    console.error('Download file error:', error);
    return new NextResponse('Failed to process download request', { status: 500 });
  }
}

async function GET(req: NextRequest) {
  try {
    // First check auth manually
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    return await handleGET(req, user);
  } catch (error) {
    console.error('Download file error:', error);
    // Return a proper error response, not JSON for file downloads
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export { GET };