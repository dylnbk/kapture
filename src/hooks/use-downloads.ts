"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MediaDownload, DownloadQueueItem } from '@/types/downloads';
import { useToast } from '@/hooks/use-toast';
import { progressStorageService } from '@/services/progress-storage-service';

const API_BASE = '/api/downloads';

interface DownloadRequestData {
  url: string;
  fileType?: 'video' | 'audio' | 'image';
  quality?: 'highest' | 'high' | 'medium' | 'low';
  trendId?: string;
}

interface DownloadsResponse {
  data: MediaDownload[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    fileLifecycle?: {
      totalDownloads: number;
      activeFiles: number;
      totalActiveSize: number;
      recentDownloads: number;
      filesKeptRatio: number;
    };
  };
}

// Hook to fetch downloads with pagination
export function useDownloads(
  page: number = 1,
  limit: number = 10,
  status?: string,
  includeStats: boolean = false
) {
  return useQuery<DownloadsResponse>({
    queryKey: ['downloads', page, limit, status, includeStats],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
        ...(includeStats && { includeStats: 'true' }),
      });
      
      const response = await fetch(`${API_BASE}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch downloads');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook to request a new download
export function useDownloadRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<any, Error, DownloadRequestData>({
    mutationFn: async (data: DownloadRequestData) => {
      const response = await fetch(`${API_BASE}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to request download';
        let errorData = null;
        
        try {
          errorData = await response.json();
          
          // Handle different possible error response structures
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData && typeof errorData === 'object') {
            // Based on console logs: errorData.error.message contains the actual message
            errorMessage = errorData.message ||
                         (errorData.error && errorData.error.message) ||
                         (errorData.error && typeof errorData.error === 'string' ? errorData.error : null) ||
                         errorData.details ||
                         errorData.description ||
                         (errorData.data && errorData.data.message);
            
            // If no message found, provide specific defaults based on status
            if (!errorMessage) {
              if (response.status === 403) {
                errorMessage = 'Usage limit exceeded';
              } else {
                errorMessage = 'Request failed';
              }
            }
          }
        } catch (parseError) {
          // If response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        console.log('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorMessage,
          fullResponse: errorData
        });
        
        // Create a custom error object with all details
        const customError = new Error(errorMessage);
        (customError as any).status = response.status;
        (customError as any).statusText = response.statusText;
        (customError as any).errorData = errorData;
        throw customError;
      }

      return response.json();
    },
    onSuccess: (response) => {
      console.log('Download request success response:', response); // Debug log
      
      // Immediately invalidate and refetch the queue to show the new download
      queryClient.invalidateQueries({ queryKey: ['downloads-queue'] });
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      
      // Force an immediate refetch of the queue
      queryClient.refetchQueries({ queryKey: ['downloads-queue'] });
      
      toast({
        title: "Download Started",
        description: "Your download has been queued and will begin processing shortly.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.log('Download Error Details:', error);
      
      let title = "Download Failed";
      let description = "Failed to start download. Please try again.";
      
      // Get the actual error message from various possible locations
      const errorMessage = error.message || error.errorData?.message || error.errorData?.error || '';
      const errorStatus = error.status;
      
      console.log('Parsed error:', { errorMessage, errorStatus, fullError: error });
      
      // Check for specific usage limit errors first
      if (errorStatus === 403 && errorMessage.includes('Usage limit exceeded for download')) {
        title = "Download Limit Reached";
        description = "You've reached your download limit for this billing period. Upgrade your plan or wait for your monthly limit to reset.";
      } else if (errorStatus === 403 && errorMessage.includes('Usage limit exceeded')) {
        title = "Usage Limit Reached";
        description = "You've reached your usage limit for this billing period. Upgrade your plan or wait for your monthly limit to reset.";
      } else if (errorStatus === 403 && (errorMessage.includes('limit') || errorMessage.includes('quota'))) {
        title = "Usage Limit Reached";
        description = "You've reached your usage limit. Upgrade your plan or wait for your limit to reset.";
      } else if (errorStatus === 429 || errorMessage.toLowerCase().includes('rate limit')) {
        title = "Too Many Requests";
        description = "You're making requests too quickly. Please wait a moment and try again.";
      } else if (errorStatus === 402 || errorMessage.toLowerCase().includes('upgrade')) {
        title = "Upgrade Required";
        description = "This feature requires a paid plan. Please upgrade your account to continue downloading.";
      } else if (errorStatus === 403) {
        title = "Access Denied";
        description = errorMessage || "You don't have permission to download from this source or your account needs verification.";
      } else if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('usage')) {
        title = "Usage Quota Exceeded";
        description = "You've exceeded your usage quota. Upgrade your plan or wait for your quota to reset.";
      } else if (errorMessage) {
        description = errorMessage;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });
}

// Hook to fetch queue items (active downloads)
export function useDownloadsQueue() {
  const queryClient = useQueryClient();

  return useQuery<DownloadQueueItem[]>({
    queryKey: ['downloads-queue'],
    queryFn: async () => {
      // Always trigger sync first for real-time updates
      let syncResult = null;
      try {
        const syncResponse = await fetch('/api/downloads/sync', {
          method: 'POST',
        });
        if (syncResponse.ok) {
          syncResult = await syncResponse.json();
          // Wait a moment for sync to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn('Failed to sync download statuses:', error);
      }

      const response = await fetch(`${API_BASE}?status=pending,processing`);
      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }
      
      const result = await response.json();
      
      // Transform downloads to queue items format with persisted progress
      return result.data.map((download: MediaDownload) => {
        const serverProgress = download.metadata?.detailedProgress;
        const storedProgress = progressStorageService.getProgress(download.id);
        
        // Use stored progress if it's more recent or if server doesn't have detailed progress
        const detailedProgress = (storedProgress && (!serverProgress || storedProgress.percentage >= (serverProgress.percentage || 0)))
          ? storedProgress
          : serverProgress || progressStorageService.getProgressWithFallback(download.id, download.downloadStatus);

        // Save the latest progress to storage
        if (serverProgress && (!storedProgress || serverProgress.percentage > (storedProgress.percentage || 0))) {
          progressStorageService.saveProgress(download.id, serverProgress);
        }

        // Clean up completed downloads from storage
        if (download.downloadStatus === 'completed') {
          progressStorageService.removeProgress(download.id);
        }

        return {
          id: download.id,
          url: download.originalUrl,
          title: download.title || download.metadata?.title || 'Processing...',
          platform: download.metadata?.platform,
          status: download.downloadStatus,
          progress: download.metadata?.progress || detailedProgress.percentage || 0,
          detailedProgress,
          error: download.metadata?.error,
          createdAt: download.createdAt,
        };
      });
    },
    refetchInterval: (query) => {
      // Production-scale polling - now with proper rate limits
      const data = query?.state?.data;
      const hasProcessingDownloads = data && data.some((item: any) => item.status === 'processing');
      const hasPendingDownloads = data && data.some((item: any) => item.status === 'pending');
      const activeCount = data?.length || 0;
      
      // If no active downloads, stop polling entirely
      if (!hasProcessingDownloads && !hasPendingDownloads) {
        return false;
      }
      
      // Smart polling based on download activity
      if (hasProcessingDownloads) {
        return 2000; // 2s for active processing - responsive but not overwhelming
      } else if (activeCount >= 3) {
        return 3000; // 3s when multiple pending downloads
      } else {
        return 2500; // 2.5s for pending downloads
      }
    },
    staleTime: 0, // Always consider stale to ensure fresh data
    refetchIntervalInBackground: true, // Continue polling when tab is not active
    enabled: true, // Always enabled
  });
}

// Hook to archive a download (move to permanent library)
export function useArchiveDownload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (downloadId: string) => {
      const response = await fetch(`${API_BASE}/${downloadId}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to archive download');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      toast({
        title: 'Success',
        description: 'Download archived to library successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive download',
        variant: 'destructive',
      });
    },
  });
}

// Hook to permanently delete a library item
export function useDeleteLibraryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/library/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete library item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      toast({
        title: 'Success',
        description: 'Library item permanently deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete library item',
        variant: 'destructive',
      });
    },
  });
}

// Hook to delete a download
export function useDeleteDownload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: async (downloadId: string) => {
      const response = await fetch(`${API_BASE}/${downloadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete download');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      toast({
        title: "Download Deleted",
        description: "The download has been removed from your history.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete download. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook for bulk operations
export function useBulkDownloadDelete() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, string[]>({
    mutationFn: async (downloadIds: string[]) => {
      const response = await fetch(`${API_BASE}/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: downloadIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete downloads');
      }
    },
    onSuccess: (_, downloadIds) => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      toast({
        title: "Downloads Deleted",
        description: `${downloadIds.length} downloads have been removed.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message || "Failed to delete downloads. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook for bulk archive operations
export function useBulkDownloadArchive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, string[]>({
    mutationFn: async (downloadIds: string[]) => {
      const response = await fetch(`${API_BASE}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'archive',
          ids: downloadIds
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive downloads');
      }
    },
    onSuccess: (_, downloadIds) => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      toast({
        title: "Downloads Archived",
        description: `${downloadIds.length} downloads have been moved to your library.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Archive Failed",
        description: error.message || "Failed to archive downloads. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook to retry a failed download
export function useRetryDownload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<any, Error, string>({
    mutationFn: async (downloadId: string) => {
      const response = await fetch(`${API_BASE}/${downloadId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to retry download');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      queryClient.invalidateQueries({ queryKey: ['downloads-queue'] });
      toast({
        title: "Download Retried",
        description: "The download has been queued for retry.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry download. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook for download statistics
export function useDownloadStats() {
  return useQuery({
    queryKey: ['download-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}?includeStats=true&limit=1`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const result = await response.json();
      return result.meta.fileLifecycle || {
        totalDownloads: 0,
        activeFiles: 0,
        totalActiveSize: 0,
        recentDownloads: 0,
        filesKeptRatio: 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}