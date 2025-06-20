"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Download, Plus, Link as LinkIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import React from "react";
import { useDownloadRequest, useDownloadsQueue } from "@/hooks/use-downloads";

export function DownloadsHeader() {
  const [url, setUrl] = useState("");
  const [fileType, setFileType] = useState<'video' | 'audio' | 'image' | undefined>(undefined);
  const [activeDownloads, setActiveDownloads] = useState<{url: string, id?: string}[]>([]);
  const downloadMutation = useDownloadRequest();
  const { data: queueItems = [] } = useDownloadsQueue();

  const handleDownload = async () => {
    if (!url.trim()) return;

    const downloadUrl = url.trim();
    
    // Add to active downloads immediately for visual feedback
    setActiveDownloads(prev => [...prev, { url: downloadUrl }]);

    try {
      const response = await downloadMutation.mutateAsync({
        url: downloadUrl,
        fileType,
        quality: 'high',
      });
      
      // Update with the actual download ID if available
      const downloadId = response?.data?.download?.id;
      if (downloadId) {
        setActiveDownloads(prev =>
          prev.map(d => d.url === downloadUrl ? { ...d, id: downloadId } : d)
        );
      }
      
      setUrl("");
    } catch (error) {
      // Remove from active downloads on error
      setActiveDownloads(prev => prev.filter(d => d.url !== downloadUrl));
      console.error('Download request failed:', error);
    }
  };

  // Function to remove completed downloads - will be called from parent
  const removeActiveDownload = (urlOrId: string) => {
    setActiveDownloads(prev =>
      prev.filter(d => d.url !== urlOrId && d.id !== urlOrId)
    );
  };

  // Expose the function via a global effect for the downloads page to call
  React.useEffect(() => {
    (window as any).removeActiveDownload = removeActiveDownload;
    return () => {
      delete (window as any).removeActiveDownload;
    };
  }, []);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const canSubmit = url.trim() && isValidUrl(url.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Download className="h-8 w-8 text-light-text-primary dark:text-dark-text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Downloads
          </h1>
        </div>
      </div>

      {/* Quick Download */}
      <Card variant="glass" className="p-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text-secondary dark:text-dark-text-secondary" />
              <Input
                placeholder="Paste URL to download (YouTube, TikTok, Instagram, etc.)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`pl-10 ${
                  url.trim() && !isValidUrl(url.trim())
                    ? 'border-light-error dark:border-dark-error'
                    : ''
                }`}
                onKeyPress={(e) => e.key === "Enter" && canSubmit && handleDownload()}
              />
            </div>
            <Button
              onClick={handleDownload}
              disabled={!canSubmit}
              variant="glass"
              className="min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          
          {/* URL Validation Feedback */}
          {url.trim() && !isValidUrl(url.trim()) && (
            <p className="text-sm text-light-error dark:text-dark-error">
              Please enter a valid URL
            </p>
          )}
          
          {/* Success/Error Messages */}
          {downloadMutation.isError && (
            <p className="text-sm text-light-error dark:text-dark-error">
              {downloadMutation.error?.message || 'Failed to start download'}
            </p>
          )}
        </div>
      </Card>

      {/* Simple Download Status */}
      {activeDownloads.length > 0 && (
        <Card variant="glass" className="p-3">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {activeDownloads.length === 1
                ? 'Download in progress...'
                : `${activeDownloads.length} downloads in progress...`}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}