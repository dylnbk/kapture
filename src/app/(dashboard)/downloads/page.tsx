"use client";

import { DownloadsHeader } from "@/components/features/downloads/downloads-header";
import { DownloadsQueue } from "@/components/features/downloads/downloads-queue";
import { DownloadHistory } from "@/components/features/downloads/download-history";
import { EmptyState } from "@/components/shared/empty-state";
import { Download, Loader2 } from "lucide-react";
import { useDownloads, useDownloadsQueue } from "@/hooks/use-downloads";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function DownloadsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [previousQueueCount, setPreviousQueueCount] = useState(0);
  const downloadsPerPage = 10;
  const { toast } = useToast();
  
  const {
    data: downloadsResponse,
    isLoading: isDownloadsLoading,
    error: downloadsError
  } = useDownloads(currentPage, downloadsPerPage, undefined, true);
  
  const {
    data: queueItems = [],
    isLoading: isQueueLoading
  } = useDownloadsQueue();

  const downloads = downloadsResponse?.data || [];
  const meta = downloadsResponse?.meta;
  const isLoading = isDownloadsLoading || isQueueLoading;

  // Track downloads to detect when new ones appear (indicating completion)
  const [previousDownloadIds, setPreviousDownloadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (downloads.length > 0) {
      const currentDownloadIds = new Set(downloads.map(d => d.id));
      
      // Only process if we have previous downloads to compare against
      if (previousDownloadIds.size > 0) {
        // Find new downloads that weren't there before
        const newDownloads = downloads.filter(d => !previousDownloadIds.has(d.id));
        
        // Remove corresponding active downloads for newly completed downloads
        if (newDownloads.length > 0 && (window as any).removeActiveDownload) {
          newDownloads.forEach(download => {
            // Try to remove by URL or ID
            (window as any).removeActiveDownload(download.originalUrl);
            (window as any).removeActiveDownload(download.id);
          });

          // Show completion notification
          toast({
            title: "Download Complete",
            description: `${newDownloads.length} download(s) finished and added to your library.`,
            variant: "default",
          });
        }
      }
      
      setPreviousDownloadIds(currentDownloadIds);
    }
  }, [downloads, toast]); // Removed previousDownloadIds from dependency array to prevent infinite loop

  // Also track queue changes for real-time status
  useEffect(() => {
    const activeCount = queueItems.filter(item =>
      item.status === 'pending' || item.status === 'processing'
    ).length;
    setPreviousQueueCount(activeCount);
  }, [queueItems]);

  // Handle error states
  if (downloadsError) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <DownloadsHeader />
        <div className="text-center py-12">
          <p className="text-light-error dark:text-dark-error">
            Failed to load downloads. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <DownloadsHeader />
      
      {/* Queue Section */}
      {queueItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary">
            Download Queue
          </h2>
          <DownloadsQueue items={queueItems} />
        </div>
      )}
      
      {/* History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary">
            Download History
          </h2>
          {meta?.fileLifecycle && (
            <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {meta.fileLifecycle.activeFiles} of {meta.fileLifecycle.totalDownloads} files kept
              ({meta.fileLifecycle.filesKeptRatio}%)
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white/5 dark:bg-black/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded w-3/4"></div>
                    <div className="h-3 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 w-20 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : downloads.length > 0 ? (
          <>
            <DownloadHistory downloads={downloads} />
            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm bg-white/5 dark:bg-black/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Page {currentPage} of {meta.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(meta.totalPages, currentPage + 1))}
                  disabled={currentPage === meta.totalPages}
                  className="px-4 py-2 text-sm bg-white/5 dark:bg-black/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Download}
            title="No downloads yet"
            description="Start by downloading media from trends or paste a URL directly"
            actionLabel="Browse Trends"
            actionHref="/dashboard/trends"
          />
        )}
      </div>
    </div>
  );
}