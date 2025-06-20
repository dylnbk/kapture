import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CircuitBreaker } from '../lib/redis-dev';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  expires?: Date;
}

export interface UploadResult {
  key: string;
  url: string;
  size?: number;
  contentType?: string;
}

export interface DownloadUrlOptions {
  expiresIn?: number; // seconds
  fileName?: string;
}

class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private circuitBreaker: InstanceType<typeof CircuitBreaker>;

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  private async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }

  private generateKey(userId: string, filename: string, folder?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    const basePath = folder ? `${folder}/${userId}` : `media/${userId}`;
    return `${basePath}/${timestamp}_${randomString}_${sanitizedFilename}`;
  }

  async uploadFile(
    userId: string,
    file: Buffer | Uint8Array,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    return this.executeWithCircuitBreaker(async () => {
      const key = this.generateKey(userId, filename);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
        CacheControl: options.cacheControl || 'public, max-age=31536000',
        Expires: options.expires,
      });

      await this.s3Client.send(command);

      const url = `${process.env.CLOUDFLARE_R2_ENDPOINT}/${this.bucketName}/${key}`;

      return {
        key,
        url,
        size: file.length,
        contentType: options.contentType,
      };
    });
  }

  async uploadFromUrl(
    userId: string,
    sourceUrl: string,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || options.contentType || 'application/octet-stream';

      return this.uploadFile(userId, new Uint8Array(buffer), filename, {
        ...options,
        contentType,
      });
    });
  }

  async getDownloadUrl(key: string, options: DownloadUrlOptions = {}): Promise<string> {
    return this.executeWithCircuitBreaker(async () => {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: options.fileName ? `attachment; filename="${options.fileName}"` : undefined,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });
    });
  }

  async getFileMetadata(key: string) {
    return this.executeWithCircuitBreaker(async () => {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    });
  }

  async deleteFile(key: string): Promise<void> {
    return this.executeWithCircuitBreaker(async () => {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    });
  }

  async deleteFiles(keys: string[]): Promise<void> {
    return this.executeWithCircuitBreaker(async () => {
      const deletePromises = keys.map(key => this.deleteFile(key));
      await Promise.all(deletePromises);
    });
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    return `${process.env.CLOUDFLARE_R2_ENDPOINT}/${this.bucketName}/${key}`;
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

  // Cleanup methods
  async cleanupOldFiles(userId: string, olderThan: Date): Promise<void> {
    // This would require listing objects and filtering by date
    // For now, we'll implement a simpler version that deletes based on key patterns
    console.log(`Cleanup requested for user ${userId} files older than ${olderThan}`);
    // Implementation would depend on your cleanup strategy
  }

  async getUserStorageUsage(userId: string): Promise<{ totalSize: number; fileCount: number }> {
    // This would require listing all objects for a user and summing sizes
    // For now, return a placeholder
    return { totalSize: 0, fileCount: 0 };
  }
}

export const storageService = new StorageService();