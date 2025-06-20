"use client";

import { LibraryHeader } from "@/components/features/library/library-header";
import { LibraryFilters } from "@/components/features/library/library-filters";
import { LibraryGrid } from "@/components/features/library/library-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Library, Download, Globe, Upload } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState("downloaded");
  const queryClient = useQueryClient();
  
  const { data: libraryData, isLoading } = useQuery({
    queryKey: ["library", activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/library?category=${activeTab}&includeStats=true`);
      if (!response.ok) throw new Error("Failed to fetch library");
      return response.json();
    },
  });

  const libraryItems = libraryData?.data || [];

  const handleUploadComplete = () => {
    // Refresh library data for all tabs
    queryClient.invalidateQueries({ queryKey: ["library"] });
    // Switch to uploaded tab to show the new files
    setActiveTab("uploaded");
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <LibraryHeader onUploadComplete={handleUploadComplete} />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="downloaded" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Downloaded
          </TabsTrigger>
          <TabsTrigger value="scraped" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Scraped
          </TabsTrigger>
          <TabsTrigger value="uploaded" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Uploaded
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          <LibraryFilters />
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white/5 dark:bg-black-5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-4 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-32 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded"></div>
                    <div className="h-4 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded w-3/4"></div>
                    <div className="h-3 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : libraryItems.length > 0 ? (
            <LibraryGrid items={libraryItems} />
          ) : (
            <EmptyState
              icon={Library}
              title="Your library is empty"
              description={
                activeTab === "downloaded"
                  ? "Archive downloads to add them to your permanent library"
                  : activeTab === "scraped"
                  ? "Scraped content will appear here"
                  : "Uploaded files will appear here"
              }
              actionLabel={
                activeTab === "scraped"
                  ? "Create Scraper"
                  : "Browse Scraping"
              }
              actionHref={
                activeTab === "scraped"
                  ? "/trends/scrape"
                  : "/trends"
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}