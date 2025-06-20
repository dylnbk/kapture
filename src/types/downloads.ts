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

export interface DownloadPhase {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  startTime?: string;
  endTime?: string;
}

export interface DownloadProgress {
  percentage: number;
  speed?: string;
  eta?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  totalSize?: string;
  currentPhase?: string;
  phases?: DownloadPhase[];
}

export interface DownloadQueueItem {
  id: string;
  url: string;
  title?: string;
  platform?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  detailedProgress?: DownloadProgress;
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