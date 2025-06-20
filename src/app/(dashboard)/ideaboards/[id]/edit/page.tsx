"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { IdeaboardCreateForm } from "@/components/features/ideaboards/ideaboard-create-form";
import { toast } from "sonner";

export default function EditIdeaboardPage() {
  const params = useParams();
  const router = useRouter();
  const [ideaboard, setIdeaboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIdeaboard = async () => {
      try {
        const response = await fetch(`/api/ideaboards/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch ideaboard");
        }
        const data = await response.json();
        setIdeaboard(data.data);
      } catch (error) {
        console.error("Error fetching ideaboard:", error);
        toast.error("Failed to load ideaboard");
        router.push("/ideaboards");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchIdeaboard();
    }
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!ideaboard) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Ideaboard not found</h1>
          <p className="text-muted-foreground mb-4">
            The ideaboard you're trying to edit doesn't exist.
          </p>
          <button
            onClick={() => router.push("/ideaboards")}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Back to Ideaboards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Ideaboard</h1>
          <p className="text-muted-foreground">
            Update your AI-powered ideaboard settings and parameters.
          </p>
        </div>
        
        <IdeaboardCreateForm 
          editMode={true} 
          initialData={ideaboard}
          onSuccess={() => {
            toast.success("Ideaboard updated successfully!");
            router.push("/ideaboards");
          }}
        />
      </div>
    </div>
  );
}