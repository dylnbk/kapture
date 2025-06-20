"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash2, Share, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Ideaboard {
  id: string;
  name: string;
  description?: string;
  keywords: string[];
  creativity: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface IdeaboardsGridProps {
  ideaboards: Ideaboard[];
  onRefresh?: () => void;
}

function IdeaboardCard({ ideaboard, onRefresh }: { ideaboard: Ideaboard; onRefresh?: () => void }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const getStatusColor = (status: Ideaboard["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "archived":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
      default:
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    }
  };

  const handleEdit = () => {
    // Navigate to edit page (you can change this to open a modal if preferred)
    router.push(`/ideaboards/${ideaboard.id}/edit`);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      console.log("Attempting to delete ideaboard:", ideaboard.id);
      console.log("Full URL:", `${window.location.origin}/api/ideaboards/${ideaboard.id}`);
      
      const response = await fetch(`/api/ideaboards/${ideaboard.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      console.log("Delete response status:", response.status);
      console.log("Delete response headers:", Object.fromEntries(response.headers));

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Delete failed:", response.status, errorData);
        
        if (response.status === 401) {
          toast.error("Authentication required. Please log in again.");
          return;
        } else if (response.status === 403) {
          toast.error("You don't have permission to delete this ideaboard.");
          return;
        } else if (response.status === 404) {
          toast.error("Ideaboard not found. It may have already been deleted.");
          return;
        }
        
        throw new Error(`Failed to delete ideaboard: ${response.status}`);
      }

      const result = await response.json();
      console.log("Delete successful:", result);

      toast.success("Ideaboard deleted successfully!");
      setShowDeleteDialog(false);
      onRefresh?.(); // Real-time update without page refresh
    } catch (error) {
      console.error("Error deleting ideaboard:", error);
      toast.error(`Failed to delete ideaboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Link href={`/ideaboards/${ideaboard.id}`}>
        <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-1">{ideaboard.name}</CardTitle>
              {ideaboard.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {ideaboard.description}
                </p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEdit();
                }}
                title="Edit ideaboard"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteClick();
                }}
                disabled={isDeleting}
                title="Delete ideaboard"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Keywords */}
            {ideaboard.keywords && ideaboard.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ideaboard.keywords.slice(0, 3).map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {ideaboard.keywords.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{ideaboard.keywords.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Creativity Level */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Creativity:</span>
              <Badge variant="outline">{ideaboard.creativity}/10</Badge>
            </div>

            {/* Status and Date */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={getStatusColor(ideaboard.status)}>
                {ideaboard.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ideaboard.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Ideaboard"
        description="Are you sure you want to delete this ideaboard? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
}

export function IdeaboardsGrid({ ideaboards, onRefresh }: IdeaboardsGridProps) {
  const sortedIdeaboards = [...ideaboards].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedIdeaboards.map((ideaboard) => (
          <IdeaboardCard
            key={ideaboard.id}
            ideaboard={ideaboard}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </>
  );
}