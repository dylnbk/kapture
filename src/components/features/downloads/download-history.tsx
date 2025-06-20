"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Download, ExternalLink, Trash2, Play, FileText, Clock, AlertTriangle, Archive } from "lucide-react";
import { MediaDownload } from "@/types/downloads";
import { formatDistanceToNow, format } from "date-fns";
import Image from "next/image";
import { useDeleteDownload, useBulkDownloadDelete, useArchiveDownload } from "@/hooks/use-downloads";
import { useState } from "react";

interface DownloadHistoryProps {
  downloads: MediaDownload[];
}

function DownloadCard({ download }: { download: MediaDownload }) {
  const deleteMutation = useDeleteDownload();
  const archiveMutation = useArchiveDownload();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "video":
        return <Play className="h-5 w-5" />;
      case "audio":
        return <FileText className="h-5 w-5" />;
      case "image":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: MediaDownload["downloadStatus"]) => {
    switch (status) {
      case "completed":
        return "bg-light-success/20 text-light-success border-light-success/30";
      case "processing":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "failed":
        return "bg-light-error/20 text-light-error border-light-error/30";
      default:
        return "bg-light-text-secondary/20 text-light-text-secondary border-light-text-secondary/30";
    }
  };

  const formatFileSize = (download: MediaDownload) => {
    // Try multiple sources for file size
    const fileSize = download.fileSize ||
                    download.metadata?.fileSize ||
                    download.metadata?.detailedProgress?.totalBytes ||
                    download.metadata?.size;
                    
    if (!fileSize) return "Unknown size";
    
    const bytes = typeof fileSize === 'string' ? parseInt(fileSize) : fileSize;
    if (!bytes || isNaN(bytes)) return "Unknown size";
    
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Check if file has been cleaned up based on lifecycle fields
  const isFileCleaned = !download.keepFile && download.fileCleanupAt && new Date(download.fileCleanupAt) <= new Date();
  const willBeCleanedUp = download.keepFile === false && download.fileCleanupAt && new Date(download.fileCleanupAt) > new Date();
  const isArchived = download.keepFile === true;

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(download.id);
    setShowDeleteDialog(false);
  };

  const handleArchive = () => {
    archiveMutation.mutate(download.id);
  };

  const handleCompleteDownload = async (downloadId: string) => {
    try {
      const response = await fetch(`/api/downloads/${downloadId}/complete`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Force refresh the page to show updated status
        window.location.reload();
      } else {
        console.error('Failed to complete download');
      }
    } catch (error) {
      console.error('Error completing download:', error);
    }
  };

  return (
    <Card variant="glass" className="group hover:scale-[1.02] transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Thumbnail or Icon */}
          <div className="flex-shrink-0">
            {download.metadata?.thumbnail ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image
                  src={download.metadata.thumbnail}
                  alt={download.title || "Download"}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-light-text-secondary/10 dark:bg-dark-text-secondary/10 rounded-lg flex items-center justify-center">
                {getFileIcon(download.fileType)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary truncate">
                  {download.metadata?.title || download.title || "Untitled"}
                </h4>
                <div className="flex items-center space-x-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {download.fileType}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(download.downloadStatus)}>
                    {download.downloadStatus}
                  </Badge>
                  {download.metadata?.platform && (
                    <Badge variant="outline" className="text-xs">
                      {download.metadata.platform}
                    </Badge>
                  )}
                  {isArchived && (
                    <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-500 border-blue-500/30">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </Badge>
                  )}
                  {isFileCleaned && (
                    <Badge variant="outline" className="text-xs bg-red-500/20 text-red-500 border-red-500/30">
                      File Cleaned Up
                    </Badge>
                  )}
                  {willBeCleanedUp && !isArchived && (
                    <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                      <Clock className="h-3 w-3 mr-1" />
                      Will be cleaned
                    </Badge>
                  )}
                  {download.keepFile && (
                    <Badge variant="outline" className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
                      Kept
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3 flex-wrap">
              <span>{formatFileSize(download)}</span>
              {formatDuration(download.duration) && (
                <span>{formatDuration(download.duration)}</span>
              )}
              <span>{formatDistanceToNow(new Date(download.createdAt), { addSuffix: true })}</span>
              {willBeCleanedUp && download.fileCleanupAt && (
                <span className="text-yellow-500 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Cleanup: {format(new Date(download.fileCleanupAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {download.downloadStatus === "completed" && !isFileCleaned ? (
                <Button variant="outline" size="sm" asChild title="Download file">
                  <a href={`/api/downloads/files/${download.id}`} download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              ) : isFileCleaned ? (
                <Button variant="outline" size="sm" disabled title="File has been cleaned up">
                  <Download className="h-4 w-4" />
                </Button>
              ) : download.downloadStatus === "failed" ? (
                <Button variant="outline" size="sm" disabled title="Download failed">
                  <Download className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled title="Processing...">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              <Button variant="ghost" size="sm" asChild title="View original source">
                <a href={download.originalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>

              {download.downloadStatus === "completed" && !isFileCleaned && !download.keepFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 dark:text-blue-400"
                  onClick={handleArchive}
                  disabled={archiveMutation.isPending}
                  title="Archive to library (keep permanently)"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="text-light-error dark:text-dark-error"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                title="Delete download"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Download"
        description={`Are you sure you want to delete "${download.metadata?.title || download.title || 'this download'}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}

export function DownloadHistory({ downloads }: DownloadHistoryProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const bulkDeleteMutation = useBulkDownloadDelete();
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  const sortedDownloads = [...downloads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleSelectAll = () => {
    if (selectedItems.length === downloads.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(downloads.map(d => d.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setShowBulkDeleteDialog(true);
  };

  const handleBulkDeleteConfirm = () => {
    bulkDeleteMutation.mutate(selectedItems);
    setSelectedItems([]);
    setShowBulkDeleteDialog(false);
  };

  const handleClearAll = () => {
    setShowClearAllDialog(true);
  };

  const handleClearAllConfirm = () => {
    bulkDeleteMutation.mutate(downloads.map(d => d.id));
    setSelectedItems([]);
    setShowClearAllDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {downloads.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-light-text-secondary dark:text-dark-text-secondary"
              >
                {selectedItems.length === downloads.length ? 'Deselect All' : 'Select All'}
              </Button>
              
              {selectedItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="text-light-error dark:text-dark-error"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedItems.length})
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={bulkDeleteMutation.isPending}
                className="text-light-error dark:text-dark-error"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sortedDownloads.map((download) => (
          <div key={download.id} className="relative">
            {downloads.length > 1 && (
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(download.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems([...selectedItems, download.id]);
                    } else {
                      setSelectedItems(selectedItems.filter(id => id !== download.id));
                    }
                  }}
                  className="rounded border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/10"
                />
              </div>
            )}
            <DownloadCard download={download} />
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Delete Selected Downloads"
        description={`Are you sure you want to delete ${selectedItems.length} download${selectedItems.length > 1 ? 's' : ''}? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirm}
        confirmText="Delete"
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
      />

      <ConfirmDialog
        open={showClearAllDialog}
        onOpenChange={setShowClearAllDialog}
        title="Clear All Downloads"
        description={`Are you sure you want to delete all ${downloads.length} downloads? This action cannot be undone.`}
        onConfirm={handleClearAllConfirm}
        confirmText="Delete All"
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}