export interface MediaDownload {
  id: string;
  originalUrl: string;
  storageUrl?: string;
  storageKey?: string;
  fileType: 'video' | 'audio' | 'image';
  fileSize?: number;
  duration?: number;
  metadata: Record<string, any>;
  downloadStatus: 'pending' | 'processing' | 'completed' | 'failed';
  title?: string;
  thumbnail?: string;
  platform?: string;
  // File lifecycle fields
  keepFile?: boolean;
  fileCleanupAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadQueueItem {
  id: string;
  url: string;
  title?: string;
  platform?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  createdAt: string;
}

export interface DownloadStats {
  totalDownloads: number;
  activeFiles: number;
  totalActiveSize: number;
  recentDownloads: number;
  filesKeptRatio: number;
}

export interface DownloadRequestOptions {
  url: string;
  fileType?: 'video' | 'audio' | 'image';
  quality?: 'highest' | 'high' | 'medium' | 'low';
  trendId?: string;
}

export interface BulkDownloadOptions {
  urls: string[];
  fileType?: 'video' | 'audio' | 'image';
  quality?: 'highest' | 'high' | 'medium' | 'low';
}