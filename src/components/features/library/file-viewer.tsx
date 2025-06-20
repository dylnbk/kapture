"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, X, ZoomIn, ZoomOut, RotateCw, FileText, Play, Pause } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FileViewerProps {
  file: {
    id: string;
    originalUrl: string;
    storageUrl?: string;
    storageKey?: string;
    fileType: 'video' | 'audio' | 'image';
    fileSize?: number;
    metadata: Record<string, any>;
    title?: string;
    thumbnail?: string;
    platform?: string;
    trend?: {
      title: string;
      url: string;
    };
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (file: any) => void;
}

export function FileViewer({ file, open, onOpenChange, onDownload }: FileViewerProps) {
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');

  const isUpload = file.originalUrl.startsWith('upload://');
  const actualFileType = file.metadata?.actualFileType || file.fileType;
  const fileName = file.metadata?.title || file.metadata?.originalName || file.title || 'Untitled';
  const mimeType = file.metadata?.mimeType;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const handleImageZoom = (direction: 'in' | 'out') => {
    setImageZoom(prev => {
      if (direction === 'in') return Math.min(prev + 25, 300);
      return Math.max(prev - 25, 25);
    });
  };

  const handleImageRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const getViewerUrl = () => {
    // For uploaded files, use direct public URL since files are in public/uploads
    if (isUpload && file.storageKey) {
      // Ensure proper path formatting for Windows-style paths
      const normalizedKey = file.storageKey.replace(/\\/g, '/');
      console.log('Upload URL (direct):', `/uploads/${normalizedKey}`); // Debug log
      return `/uploads/${normalizedKey}`;
    }
    
    if (file.storageUrl) {
      return file.storageUrl;
    }
    return `/api/downloads/files/${file.id}`;
  };

  // Fetch text/markdown content when file opens
  useEffect(() => {
    if (open && actualFileType === 'document' && (mimeType === 'text/plain' || mimeType === 'text/markdown')) {
      const fetchContent = async () => {
        try {
          const viewerUrl = getViewerUrl();
          console.log('Fetching content from:', viewerUrl, 'mimeType:', mimeType); // Debug log
          const response = await fetch(viewerUrl);
          const content = await response.text();
          console.log('Fetched content length:', content.length, 'First 100 chars:', content.substring(0, 100)); // Debug log
          if (mimeType === 'text/markdown' || fileName.endsWith('.md')) {
            console.log('Setting markdown content'); // Debug log
            setMarkdownContent(content);
            setTextContent(''); // Clear text content
          } else {
            console.log('Setting text content'); // Debug log
            setTextContent(content);
            setMarkdownContent(''); // Clear markdown content
          }
        } catch (error) {
          console.error('Failed to fetch content:', error);
        }
      };
      fetchContent();
    }
  }, [open, actualFileType, mimeType]);

  const renderContent = () => {
    const viewerUrl = getViewerUrl();

    switch (actualFileType) {
      case 'image':
        return (
          <div className="relative w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden p-4 pb-16">
            <div
              className="relative transition-transform duration-200 flex items-center justify-center"
              style={{
                transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <Image
                src={viewerUrl}
                alt={fileName}
                width={800}
                height={600}
                className="object-contain max-w-full max-h-full"
                unoptimized
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: 'calc(70vh - 5rem)'
                }}
              />
            </div>
            
            {/* Image Controls */}
            <div className="absolute bottom-4 left-4 flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleImageZoom('out')}
                disabled={imageZoom <= 25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleImageZoom('in')}
                disabled={imageZoom >= 300}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleImageRotate}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" className="cursor-default pointer-events-none">
                {imageZoom}%
              </Button>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
            <video
              controls
              className="max-w-full max-h-full"
              preload="metadata"
              poster={file.thumbnail}
              crossOrigin="anonymous"
              playsInline
            >
              <source src={viewerUrl} type={mimeType || 'video/mp4'} />
              <source src={viewerUrl} type="video/webm" />
              <source src={viewerUrl} type="video/quicktime" />
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-8">
            <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
              <Play className="h-16 w-16 text-gray-400" />
            </div>
            <audio
              controls
              className="w-full max-w-md"
              preload="metadata"
            >
              <source src={viewerUrl} type={mimeType || 'audio/mpeg'} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        );

      case 'document':
        // For documents, show preview if possible, otherwise download link
        if (mimeType === 'application/pdf') {
          return (
            <div className="w-full h-full">
              <iframe
                src={viewerUrl}
                className="w-full h-full rounded-lg"
                title={fileName}
              />
            </div>
          );
        } else if (mimeType === 'text/markdown' || fileName.endsWith('.md') || markdownContent) {
          return (
            <div className="w-full h-full bg-white dark:bg-gray-900 rounded-lg p-6 overflow-auto">
              <div className="max-w-4xl mx-auto">
                {markdownContent ? (
                  <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdownContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-gray-500">Loading markdown content...</div>
                )}
              </div>
            </div>
          );
        } else if (mimeType === 'text/plain') {
          return (
            <div className="w-full h-full bg-white dark:bg-gray-900 rounded-lg p-6 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {textContent}
                </pre>
              </div>
            </div>
          );
        } else {
          return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-8">
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">{fileName}</h3>
              <p className="text-gray-500 mb-4">Preview not available for this file type</p>
              <Button onClick={() => onDownload?.(file)}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          );
        }

      default:
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-8">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">{fileName}</h3>
            <p className="text-gray-500 mb-4">No preview available</p>
            <Button onClick={() => onDownload?.(file)}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden [&>button[data-state]]:absolute [&>button[data-state]]:top-4 [&>button[data-state]]:right-4 [&>button[data-state]]:rounded-full [&>button[data-state]]:bg-white/10 [&>button[data-state]]:backdrop-blur-sm [&>button[data-state]]:border-0 [&>button[data-state]]:p-2 hover:[&>button[data-state]]:bg-white/20">
        {/* Header */}
        <div className="p-6 border-b pr-16">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold truncate pr-4">
                {fileName}
              </DialogTitle>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="secondary">
                  {actualFileType.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500">
                  {formatFileSize(file.fileSize)}
                </span>
                {isUpload && (
                  <Badge variant="outline">Uploaded</Badge>
                )}
                {!isUpload && file.platform && (
                  <Badge variant="outline">{file.platform}</Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload?.(file)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              {!isUpload && file.trend?.url && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={file.trend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Source
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6" style={{ height: '70vh' }}>
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}