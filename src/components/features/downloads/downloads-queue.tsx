"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { X, Pause, Play, RotateCcw, Loader2 } from "lucide-react";
import { DownloadQueueItem } from "@/types/downloads";
import { formatDistanceToNow } from "date-fns";
import { useRetryDownload, useDeleteDownload } from "@/hooks/use-downloads";
import { useState } from "react";

interface DownloadsQueueProps {
  items: DownloadQueueItem[];
}

function QueueItemCard({ item }: { item: DownloadQueueItem }) {
  const retryMutation = useRetryDownload();
  const deleteMutation = useDeleteDownload();
  const [isActioning, setIsActioning] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusColor = (status: DownloadQueueItem["status"]) => {
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

  const getStatusIcon = (status: DownloadQueueItem["status"]) => {
    if (isActioning) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    switch (status) {
      case "processing":
        return <Pause className="h-4 w-4" />;
      case "failed":
        return <RotateCcw className="h-4 w-4" />;
      case "pending":
        return <Play className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleRetry = async () => {
    setIsActioning(true);
    try {
      await retryMutation.mutateAsync(item.id);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsActioning(true);
    try {
      await deleteMutation.mutateAsync(item.id);
    } finally {
      setIsActioning(false);
    }
    setShowDeleteDialog(false);
  };

  const canRetry = item.status === "failed" && !isActioning;
  const canCancel = (item.status === "pending" || item.status === "processing") && !isActioning;

  return (
    <Card variant="glass" className="p-4">
      <div className="flex items-center justify-between space-x-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary truncate">
              {item.title || item.url}
            </h4>
            <Badge variant="outline" className={getStatusColor(item.status)}>
              {item.status}
            </Badge>
          </div>
          
          {item.platform && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
              from {item.platform}
            </p>
          )}
          
          {item.status === "processing" && item.progress !== undefined && (
            <div className="space-y-1">
              <Progress value={item.progress} className="h-2" />
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {item.progress}% complete
              </p>
            </div>
          )}
          
          {item.error && (
            <p className="text-sm text-light-error dark:text-dark-error mt-2">
              {item.error}
            </p>
          )}
          
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {item.status === "processing" && (
            <Button
              variant="outline"
              size="sm"
              disabled={isActioning}
              title="Pause download (coming soon)"
            >
              {getStatusIcon(item.status)}
            </Button>
          )}
          
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isActioning || retryMutation.isPending}
              title="Retry download"
            >
              {getStatusIcon(item.status)}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="text-light-error dark:text-dark-error"
            onClick={handleDelete}
            disabled={isActioning || deleteMutation.isPending}
            title={canCancel ? "Cancel download" : "Remove from queue"}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Cancel Download"
        description={`Are you sure you want to ${canCancel ? 'cancel' : 'remove'} "${item.title || item.url}"?`}
        onConfirm={handleDeleteConfirm}
        confirmText={canCancel ? "Cancel" : "Remove"}
        variant="destructive"
        isLoading={isActioning || deleteMutation.isPending}
      />
    </Card>
  );
}

export function DownloadsQueue({ items }: DownloadsQueueProps) {
  const [isBulkActioning, setIsBulkActioning] = useState(false);
  const deleteMutation = useDeleteDownload();
  const [showClearCompletedDialog, setShowClearCompletedDialog] = useState(false);
  const [showRetryFailedDialog, setShowRetryFailedDialog] = useState(false);
  
  const activeItems = items.filter(item => item.status === "processing" || item.status === "pending");
  const completedItems = items.filter(item => item.status === "completed");
  const failedItems = items.filter(item => item.status === "failed");

  const handleClearCompleted = () => {
    if (completedItems.length === 0) return;
    setShowClearCompletedDialog(true);
  };

  const handleClearCompletedConfirm = async () => {
    setIsBulkActioning(true);
    try {
      // Clear completed items one by one
      for (const item of completedItems) {
        await deleteMutation.mutateAsync(item.id);
      }
    } finally {
      setIsBulkActioning(false);
    }
    setShowClearCompletedDialog(false);
  };

  const handleRetryAll = () => {
    if (failedItems.length === 0) return;
    setShowRetryFailedDialog(true);
  };

  const handleRetryAllConfirm = async () => {
    setIsBulkActioning(true);
    try {
      // This would require a bulk retry API endpoint
      // For now, we'll just show the action is in progress
      console.log('Bulk retry not implemented yet');
    } finally {
      setIsBulkActioning(false);
    }
    setShowRetryFailedDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
            Queue ({items.length})
          </h3>
          <div className="flex items-center space-x-2">
            {activeItems.length > 0 && (
              <Badge variant="secondary">{activeItems.length} active</Badge>
            )}
            {failedItems.length > 0 && (
              <Badge variant="destructive">{failedItems.length} failed</Badge>
            )}
            {completedItems.length > 0 && (
              <Badge variant="outline" className="bg-light-success/20 text-light-success border-light-success/30">
                {completedItems.length} completed
              </Badge>
            )}
          </div>
        </div>
        
        {items.length > 0 && (
          <div className="flex items-center space-x-2">
            {failedItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryAll}
                disabled={isBulkActioning}
              >
                {isBulkActioning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Retry Failed
              </Button>
            )}
            
            {completedItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-light-error dark:text-dark-error"
                onClick={handleClearCompleted}
                disabled={isBulkActioning || deleteMutation.isPending}
              >
                {isBulkActioning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Clear Completed
              </Button>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {items.map((item) => (
          <QueueItemCard key={item.id} item={item} />
        ))}
      </div>
      
      {items.length === 0 && (
        <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
          <p>No downloads in queue</p>
        </div>
      )}

      <ConfirmDialog
        open={showClearCompletedDialog}
        onOpenChange={setShowClearCompletedDialog}
        title="Clear Completed Downloads"
        description={`Are you sure you want to clear ${completedItems.length} completed download${completedItems.length > 1 ? 's' : ''} from the queue?`}
        onConfirm={handleClearCompletedConfirm}
        confirmText="Clear"
        variant="destructive"
        isLoading={isBulkActioning || deleteMutation.isPending}
      />

      <ConfirmDialog
        open={showRetryFailedDialog}
        onOpenChange={setShowRetryFailedDialog}
        title="Retry Failed Downloads"
        description={`Are you sure you want to retry ${failedItems.length} failed download${failedItems.length > 1 ? 's' : ''}?`}
        onConfirm={handleRetryAllConfirm}
        confirmText="Retry All"
        variant="default"
        isLoading={isBulkActioning}
      />
    </div>
  );
}