"use client";

import { IdeaboardsHeader } from "@/components/features/ideaboards/ideaboards-header";
import { IdeaboardsGrid } from "@/components/features/ideaboards/ideaboards-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { Lightbulb } from "lucide-react";
import { Ideaboard } from "@/types/ideaboards";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function IdeaboardsPage() {
  const [ideaboards, setIdeaboards] = useState<Ideaboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIdeaboards = async () => {
    try {
      console.log("Fetching ideaboards...");
      const response = await fetch("/api/ideaboards?limit=50", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("Fetch response status:", response.status);
      console.log("Fetch response headers:", Object.fromEntries(response.headers));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch ideaboards: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetch successful:", data);
      setIdeaboards(data.data || []);
    } catch (error) {
      console.error("Error fetching ideaboards:", error);
      toast.error("Failed to load ideaboards");
      setIdeaboards([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeaboards();
  }, []);

  const handleRefresh = () => {
    fetchIdeaboards();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <IdeaboardsHeader />
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/5 dark:bg-black/5 backdrop-blur-md border border-gray-200/60 dark:border-white/20 rounded-xl p-6 animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded w-3/4"></div>
                <div className="h-20 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded"></div>
                <div className="h-4 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : ideaboards.length > 0 ? (
        <IdeaboardsGrid ideaboards={ideaboards} onRefresh={handleRefresh} />
      ) : (
        <EmptyState
          icon={Lightbulb}
          title="No ideaboards yet"
          description="Create your first AI-powered ideaboard to generate content ideas"
          actionLabel="Create Ideaboard"
          actionHref="/ideaboards/new"
        />
      )}
    </div>
  );
}