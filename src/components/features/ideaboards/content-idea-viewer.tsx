"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContentIdea {
  id: string;
  title: string;
  description?: string;
  content?: string;
  contentType: string;
  toneStyle: string;
  targetAudience?: string;
  status: 'draft' | 'ai_suggested' | 'ai_generated' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface ContentIdeaViewerProps {
  contentIdea: ContentIdea;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const renderMarkdownContent = (content: string) => {
  return content
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 text-foreground">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3 text-foreground">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mb-2 text-foreground">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-foreground">$1</em>')
    .replace(/<u>(.*?)<\/u>/g, '<u class="underline text-foreground">$1</u>')
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-border pl-4 italic text-muted-foreground mb-4">$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1 text-foreground">• $1</li>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80">$1</a>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
};

export function ContentIdeaViewer({ 
  contentIdea, 
  onClose, 
  onEdit, 
  onDelete 
}: ContentIdeaViewerProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    onDelete();
    setIsDeleting(false);
  };

  const getStatusColor = (status: ContentIdea["status"]) => {
    switch (status) {
      case "draft":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
      case "ai_suggested":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "ai_generated":
        return "bg-purple-500/20 text-purple-500 border-purple-500/30";
      case "completed":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between pr-8">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{contentIdea.title}</DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {contentIdea.contentType.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {contentIdea.toneStyle}
                </Badge>
                {contentIdea.targetAudience && (
                  <Badge variant="outline" className="text-xs">
                    {contentIdea.targetAudience}
                  </Badge>
                )}
                <Badge variant="outline" className={getStatusColor(contentIdea.status)}>
                  {contentIdea.status.replace('_', ' ')}
                </Badge>
              </div>
              {contentIdea.description && (
                <p className="text-muted-foreground mt-2">{contentIdea.description}</p>
              )}
            </div>
            <div className="flex gap-2 mr-4">
              <Button variant="outline" size="icon" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {contentIdea.content ? (
            <div className="prose prose-sm max-w-none dark:prose-invert p-6">
              <div 
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdownContent(contentIdea.content)
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-center">
              <div className="space-y-2">
                <p className="text-muted-foreground">No content available</p>
                <Button variant="outline" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Created {formatDistanceToNow(new Date(contentIdea.createdAt), { addSuffix: true })}</span>
            <span>Updated {formatDistanceToNow(new Date(contentIdea.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}