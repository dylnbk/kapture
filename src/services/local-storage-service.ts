import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  size?: number;
  contentType?: string;
}

class LocalStorageService {
  private baseDir: string;

  constructor() {
    // Store uploads in the public/uploads directory so they can be served statically
    this.baseDir = path.join(process.cwd(), 'public', 'uploads');
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
    }
  }

  private generateKey(userId: string, filename: string): string {
    const timestamp = Date.now();
    const randomId = randomUUID();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Create subdirectory structure: uploads/userId/timestamp_randomId_filename
    return path.join(userId, `${timestamp}_${randomId}_${sanitizedFilename}`);
  }

  async uploadFile(
    userId: string,
    file: Buffer | Uint8Array,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const key = this.generateKey(userId, filename);
      const fullPath = path.join(this.baseDir, key);
      
      // Ensure the user's directory exists
      const userDir = path.dirname(fullPath);
      await fs.mkdir(userDir, { recursive: true });
      
      // Write the file
      await fs.writeFile(fullPath, file);
      
      // Create URL that can be served by Next.js
      const url = `/uploads/${key.replace(/\\/g, '/')}`;
      
      return {
        key,
        url,
        size: file.length,
        contentType: options.contentType,
      };
    } catch (error) {
      console.error('Local storage upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const fullPath = path.join(this.baseDir, key);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Local storage delete error:', error);
      // Don't throw error if file doesn't exist
      if ((error as any)?.code !== 'ENOENT') {
        throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map(key => this.deleteFile(key));
    await Promise.allSettled(deletePromises); // Use allSettled to not fail if some files don't exist
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, key);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    return `/uploads/${key.replace(/\\/g, '/')}`;
  }

  // Get file stats
  async getFileStats(key: string) {
    try {
      const fullPath = path.join(this.baseDir, key);
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility methods for different file types
  async uploadVideo(userId: string, videoBuffer: Buffer, filename: string, metadata?: Record<string, string>): Promise<UploadResult> {
    return this.uploadFile(userId, videoBuffer, filename, {
      contentType: 'video/mp4',
      metadata: {
        ...metadata,
        fileType: 'video',
      },
    });
  }

  async uploadAudio(userId: string, audioBuffer: Buffer, filename: string, metadata?: Record<string, string>): Promise<UploadResult> {
    return this.uploadFile(userId, audioBuffer, filename, {
      contentType: 'audio/mpeg',
      metadata: {
        ...metadata,
        fileType: 'audio',
      },
    });
  }

  async uploadImage(userId: string, imageBuffer: Buffer, filename: string, metadata?: Record<string, string>): Promise<UploadResult> {
    return this.uploadFile(userId, imageBuffer, filename, {
      contentType: 'image/jpeg',
      metadata: {
        ...metadata,
        fileType: 'image',
      },
    });
  }

  async uploadDocument(userId: string, docBuffer: Buffer, filename: string, contentType: string, metadata?: Record<string, string>): Promise<UploadResult> {
    return this.uploadFile(userId, docBuffer, filename, {
      contentType,
      metadata: {
        ...metadata,
        fileType: 'document',
      },
    });
  }

  // Batch operations
  async uploadMultipleFiles(
    userId: string,
    files: Array<{ buffer: Buffer; filename: string; options?: UploadOptions }>
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(({ buffer, filename, options }) =>
      this.uploadFile(userId, buffer, filename, options)
    );
    
    return Promise.all(uploadPromises);
  }

  // Get storage usage for a user
  async getUserStorageUsage(userId: string): Promise<{ totalSize: number; fileCount: number }> {
    try {
      const userDir = path.join(this.baseDir, userId);
      let totalSize = 0;
      let fileCount = 0;

      try {
        const files = await fs.readdir(userDir);
        for (const file of files) {
          const filePath = path.join(userDir, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
            fileCount++;
          }
        }
      } catch (error) {
        // User directory doesn't exist or is empty
        return { totalSize: 0, fileCount: 0 };
      }

      return { totalSize, fileCount };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { totalSize: 0, fileCount: 0 };
    }
  }
}

export const localStorageService = new LocalStorageService();