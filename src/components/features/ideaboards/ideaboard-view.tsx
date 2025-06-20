"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sparkles, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ContentIdeaForm, FormData } from "./content-idea-form";
import { ContentEditor } from "./content-editor";
import { ContentIdeaViewer } from "./content-idea-viewer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

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

interface Ideaboard {
  id: string;
  name: string;
  description?: string;
  keywords: string[];
  creativity: number;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  contentIdeas?: ContentIdea[];
}

interface IdeaboardViewProps {
  ideaboard: Ideaboard;
}

function ContentIdeaCard({
  idea,
  onView,
  onEdit,
  onDelete
}: {
  idea: ContentIdea;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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

  const getContentTypeIcon = (type: string) => {
    // Return appropriate icon based on content type
    return "📝"; // Default icon
  };

  return (
    <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer" onClick={onView}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{getContentTypeIcon(idea.contentType)}</span>
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{idea.title}</CardTitle>
            {idea.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {idea.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Content Type and Tone */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {idea.contentType}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {idea.toneStyle}
          </Badge>
          {idea.targetAudience && (
            <Badge variant="outline" className="text-xs">
              {idea.targetAudience}
            </Badge>
          )}
        </div>

        {/* Status and Date */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={getStatusColor(idea.status)}>
            {idea.status.replace('_', ' ')}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(idea.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function IdeaboardView({ ideaboard }: IdeaboardViewProps) {
  const [showContentForm, setShowContentForm] = useState(false);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [showContentViewer, setShowContentViewer] = useState(false);
  const [selectedContentIdea, setSelectedContentIdea] = useState<ContentIdea | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [editingContent, setEditingContent] = useState<ContentIdea | null>(null);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<ContentIdea | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleGenerateIdeas = async () => {
    setIsGeneratingIdeas(true);
    // TODO: Implement AI idea generation
    setTimeout(() => setIsGeneratingIdeas(false), 2000);
  };

  const handleFormNext = (data: FormData) => {
    setFormData(data);
    setShowContentForm(false);
    setShowContentEditor(true);
  };

  const handleEditorBack = () => {
    setShowContentEditor(false);
    setShowContentForm(true);
  };

  const handleEditorClose = () => {
    setShowContentEditor(false);
    setShowContentForm(false);
    setFormData(null);
    setEditingContent(null);
  };

  const handleSuccess = () => {
    setShowContentEditor(false);
    setShowContentForm(false);
    setFormData(null);
    setEditingContent(null);
    // Refresh the page to show new content
    window.location.reload();
  };

  const handleViewContent = (idea: ContentIdea) => {
    setSelectedContentIdea(idea);
    setShowContentViewer(true);
  };

  const handleEditContent = (idea: ContentIdea) => {
    // Set up form data from existing content
    const editFormData = {
      title: idea.title,
      description: idea.description || "",
      contentType: idea.contentType,
      toneStyle: idea.toneStyle,
      targetAudience: idea.targetAudience || "",
    };
    
    setFormData(editFormData);
    setEditingContent(idea);
    setShowContentEditor(true);
  };

  const handleDeleteContent = (idea: ContentIdea) => {
    setContentToDelete(idea);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/ideaboards/${ideaboard.id}/content/${contentToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete content");
      }

      toast.success("Content idea deleted successfully!");
      setShowDeleteDialog(false);
      setContentToDelete(null);
      // Refresh the page to show updated content (real-time update)
      window.location.reload();
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error("Failed to delete content idea");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ideaboards">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{ideaboard.name}</h1>
            {ideaboard.description && (
              <p className="text-muted-foreground mt-1">{ideaboard.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateIdeas}
            disabled={isGeneratingIdeas}
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGeneratingIdeas ? "Generating..." : "AI Generate Ideas"}
          </Button>
          <Button onClick={() => setShowContentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Content
          </Button>
        </div>
      </div>

      {/* Content Ideas */}
      <div>
        
        {ideaboard.contentIdeas && ideaboard.contentIdeas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideaboard.contentIdeas.map((idea) => (
              <ContentIdeaCard
                key={idea.id}
                idea={idea}
                onView={() => handleViewContent(idea)}
                onEdit={() => handleEditContent(idea)}
                onDelete={() => handleDeleteContent(idea)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="space-y-4">
              <div className="text-4xl">💡</div>
              <div>
                <h3 className="text-lg font-semibold">No content ideas yet</h3>
                <p className="text-muted-foreground">
                  Start by adding your first content idea or let AI generate some for you
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowContentForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
                <Button variant="outline" onClick={handleGenerateIdeas} disabled={isGeneratingIdeas}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGeneratingIdeas ? "Generating..." : "AI Generate"}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Content Form Modal */}
      {showContentForm && (
        <ContentIdeaForm
          ideaboardId={ideaboard.id}
          onClose={() => setShowContentForm(false)}
          onNext={handleFormNext}
        />
      )}

      {/* Content Editor Modal */}
      {showContentEditor && formData && (
        <ContentEditor
          ideaboardId={ideaboard.id}
          formData={formData}
          onClose={handleEditorClose}
          onBack={handleEditorBack}
          onSuccess={handleSuccess}
          editingContent={editingContent}
        />
      )}

      {/* Content Viewer Modal */}
      {showContentViewer && selectedContentIdea && (
        <ContentIdeaViewer
          contentIdea={selectedContentIdea}
          onClose={() => {
            setShowContentViewer(false);
            setSelectedContentIdea(null);
          }}
          onEdit={() => {
            setShowContentViewer(false);
            handleEditContent(selectedContentIdea);
          }}
          onDelete={() => {
            setShowContentViewer(false);
            handleDeleteContent(selectedContentIdea);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Content Idea"
        description="Are you sure you want to delete this content idea? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}