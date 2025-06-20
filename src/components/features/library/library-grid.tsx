import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Play, FileText, Clock, Trash2, Eye, Image as ImageIcon, Music, FileIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useDeleteLibraryItem } from "@/hooks/use-downloads";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileViewer } from "./file-viewer";

// Extended MediaDownload type that includes trend relationship
interface MediaDownloadWithTrend {
  id: string;
  originalUrl: string;
  storageUrl?: string;
  storageKey?: string;
  fileType: 'video' | 'audio' | 'image';
  fileSize?: number;
  duration?: string;
  metadata: Record<string, any>;
  downloadStatus: 'pending' | 'processing' | 'completed' | 'failed';
  title?: string;
  thumbnail?: string;
  platform?: string;
  keepFile?: boolean;
  fileCleanupAt?: string;
  createdAt: string;
  updatedAt: string;
  trend?: {
    id: string;
    title: string;
    description?: string;
    author?: string;
    platform: string;
    url: string;
  };
}

interface LibraryGridProps {
  items: MediaDownloadWithTrend[];
}

export function LibraryGrid({ items }: LibraryGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    item: MediaDownloadWithTrend | null;
  }>({ open: false, item: null });
  const [viewerDialog, setViewerDialog] = useState<{
    open: boolean;
    item: MediaDownloadWithTrend | null;
  }>({ open: false, item: null });
  const deleteLibraryItem = useDeleteLibraryItem();

  const getFileIcon = (item: MediaDownloadWithTrend) => {
    // For uploaded files, use actualFileType from metadata
    const isUpload = item.originalUrl.startsWith('upload://');
    const actualType = isUpload ? item.metadata?.actualFileType : item.fileType;
    
    switch (actualType) {
      case "video":
        return <Play className="h-5 w-5" />;
      case "audio":
        return <Music className="h-5 w-5" />;
      case "image":
        return <ImageIcon className="h-5 w-5" />;
      case "document":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  const getFileType = (item: MediaDownloadWithTrend) => {
    // For uploaded files, use actualFileType from metadata
    const isUpload = item.originalUrl.startsWith('upload://');
    return isUpload ? item.metadata?.actualFileType || item.fileType : item.fileType;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const handleDownload = async (item: MediaDownloadWithTrend) => {
    try {
      const isUpload = item.originalUrl.startsWith('upload://');
      let downloadUrl;
      
      if (isUpload && item.storageKey) {
        // For uploaded files, use direct public URL
        const normalizedKey = item.storageKey.replace(/\\/g, '/');
        downloadUrl = `/uploads/${normalizedKey}`;
      } else {
        // For downloaded files, use API route
        downloadUrl = `/api/downloads/files/${item.id}`;
      }
      
      const response = await fetch(downloadUrl);
      if (response.ok) {
        // Get filename from content-disposition header or use title/metadata
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'download';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        } else if (item.metadata?.originalName) {
          // For uploads, use original filename
          filename = item.metadata.originalName;
        } else if (item.trend?.title) {
          // For downloads, use title with file extension
          const extension = item.fileType === 'video' ? '.mp4' : item.fileType === 'audio' ? '.mp3' : '.file';
          filename = `${item.trend.title.replace(/[^a-zA-Z0-9\s]/g, '')}${extension}`;
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Download failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleDeleteClick = (item: MediaDownloadWithTrend) => {
    setDeleteDialog({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.item) return;
    
    setDeletingId(deleteDialog.item.id);
    setDeleteDialog({ open: false, item: null });
    
    try {
      await deleteLibraryItem.mutateAsync(deleteDialog.item.id);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, item: null });
  };

  const handleViewClick = (item: MediaDownloadWithTrend) => {
    setViewerDialog({ open: true, item });
  };

  const getItemTitle = (item: MediaDownloadWithTrend) => {
    return item.trend?.title || item.title || item.metadata?.title || 'this item';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
      {items.map((item) => (
        <Card key={item.id} className="group hover:shadow-lg transition-all duration-200 bg-white/5 dark:bg-black/5 backdrop-blur-md border border-gray-200/60 dark:border-white/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Thumbnail */}
              <div className="relative aspect-square bg-light-background-secondary dark:bg-dark-background-secondary rounded-lg overflow-hidden">
                {(item.thumbnail || item.metadata?.thumbnail) ? (
                  <Image
                    src={item.thumbnail || item.metadata?.thumbnail}
                    alt={item.trend?.title || item.title || item.metadata?.title || "Content thumbnail"}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileIcon(item)}
                  </div>
                )}
                
                {/* File type and size overlay */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {getFileType(item)}
                  </Badge>
                </div>
                
                {/* Duration for videos */}
                {item.duration && (
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.duration}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content info */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm line-clamp-2 text-light-text-primary dark:text-dark-text-primary">
                  {item.trend?.title || item.title || item.metadata?.title || "Untitled"}
                </h3>
                
                <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  <span>{formatFileSize(item.fileSize)}</span>
                  <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                </div>

                {/* Platform and author */}
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs">
                    {item.trend?.platform || item.platform || item.metadata?.platform || 'Unknown'}
                  </Badge>
                  {(item.trend?.author || item.metadata?.uploader) && (
                    <span className="text-light-text-secondary dark:text-dark-text-secondary truncate">
                      by {item.trend?.author || item.metadata?.uploader}
                    </span>
                  )}
                </div>

                {/* Archived badge */}
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs w-fit">
                  Archived
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewClick(item)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(item)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteClick(item)}
                  disabled={deletingId === item.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                
                {item.trend?.url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                  >
                    <a
                      href={item.trend.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && handleDeleteCancel()}
        title="Delete Library Item"
        description={`Are you sure you want to permanently delete "${deleteDialog.item ? getItemTitle(deleteDialog.item) : ''}"? This action cannot be undone and will remove the file from storage.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deletingId === deleteDialog.item?.id}
      />
      
      {/* File Viewer */}
      {viewerDialog.item && (
        <FileViewer
          file={viewerDialog.item}
          open={viewerDialog.open}
          onOpenChange={(open) => setViewerDialog({ open, item: open ? viewerDialog.item : null })}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}