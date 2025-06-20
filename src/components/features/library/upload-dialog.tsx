"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, X, File, Image, Video, Music, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UploadFile {
  file: File;
  id: string;
  status: 'waiting' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  uploadedId?: string;
}

interface UploadDialogProps {
  onUploadComplete?: () => void;
}

export function UploadDialog({ onUploadComplete }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (type.startsWith('audio/')) return <Music className="h-5 w-5 text-green-500" />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return <FileText className="h-5 w-5 text-orange-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isValidFileType = (file: File) => {
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
      // Documents
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv', 'text/markdown'
    ];
    return allowedTypes.includes(file.type);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Validate files
    const validFiles = selectedFiles.filter(file => {
      if (!isValidFileType(file)) {
        toast({
          title: "Invalid file type",
          description: `File "${file.name}" is not supported`,
          variant: "destructive",
        });
        return false;
      }
      
      if (file.size > 100 * 1024 * 1024) { // 100MB
        toast({
          title: "File too large",
          description: `File "${file.name}" exceeds 100MB limit`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    // Check total file count
    if (files.length + validFiles.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 files allowed per upload session",
        variant: "destructive",
      });
      return;
    }

    const newFiles: UploadFile[] = validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(2, 15),
      status: 'waiting',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(({ file }) => {
        formData.append('files', file);
      });

      // Update all files to uploading status
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const, progress: 0 })));

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      // Update file statuses based on results
      setFiles(prev => prev.map(f => {
        const uploadResult = result.data.uploaded.find((u: any) => u.filename === f.file.name);
        const failedResult = result.data.failed.find((u: any) => u.filename === f.file.name);
        
        if (uploadResult) {
          return { ...f, status: 'completed' as const, progress: 100, uploadedId: uploadResult.id };
        } else if (failedResult) {
          return { ...f, status: 'failed' as const, progress: 0, error: failedResult.error };
        }
        return f;
      }));

      if (result.data.successful > 0) {
        toast({
          title: "Upload successful",
          description: `${result.data.successful} file(s) uploaded successfully`,
        });
        
        // Call completion callback
        onUploadComplete?.();
      }

      if (result.data.failed.length > 0) {
        toast({
          title: "Some uploads failed",
          description: `${result.data.failed.length} file(s) failed to upload`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      // Mark all files as failed
      setFiles(prev => prev.map(f => ({ 
        ...f, 
        status: 'failed' as const, 
        progress: 0, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      })));

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setOpen(false);
    }
  };

  const canUpload = files.length > 0 && !uploading && files.some(f => f.status === 'waiting');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glass">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload documents, images, videos, or audio files to your library. Max 10 files, 100MB each.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Upload Area */}
          <div 
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            onClick={handleFileSelect}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Click to select files</p>
            <p className="text-sm text-gray-500">
              Supports images, videos, audio, and documents
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.md"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="flex-1 overflow-y-auto border rounded-lg">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b">
                <h3 className="font-medium">Files to Upload ({files.length})</h3>
              </div>
              <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                {files.map((uploadFile) => (
                  <div key={uploadFile.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    {getFileIcon(uploadFile.file.type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{uploadFile.file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(uploadFile.file.size)}</p>
                      
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="mt-2" />
                      )}
                      
                      {uploadFile.error && (
                        <p className="text-sm text-red-500 mt-1">{uploadFile.error}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {uploadFile.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {uploadFile.status === 'failed' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      {uploadFile.status === 'waiting' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {files.length > 0 && (
              <span>
                {files.filter(f => f.status === 'completed').length} completed, {' '}
                {files.filter(f => f.status === 'waiting').length} waiting
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Close'}
            </Button>
            {canUpload && (
              <Button onClick={uploadFiles} disabled={uploading}>
                Upload {files.filter(f => f.status === 'waiting').length} Files
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}