"use client";

import { TrendsHeader } from "@/components/features/trends/trends-header";
import { TrendsFilters } from "@/components/features/trends/trends-filters";
import { ScrapersGrid } from "@/components/features/trends/scrapers-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { ScanSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

interface Scraper {
  id: string;
  name: string;
  keywords: string[];
  hashtags: string[];
  urls: string[];
  isActive: boolean;
  createdAt: string;
  lastRun?: string;
  totalScraped: number;
  status: 'idle' | 'running' | 'paused' | 'error';
}

export default function ScrapingPage() {
  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  
  // Mock data for now - in real app, this would come from API
  const isLoading = false;

  const toggleScraper = async (scraperId: string) => {
    const scraper = scrapers.find(s => s.id === scraperId);
    if (!scraper) return;

    const newStatus = scraper.status === 'running' ? 'paused' : 'running';
    
    try {
      const response = await fetch(`/api/trends/${scraperId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update scraper");
      }

      setScrapers(prev => prev.map(s => 
        s.id === scraperId 
          ? { ...s, status: newStatus as 'running' | 'paused' }
          : s
      ));

      toast.success(`Scraper ${newStatus === 'running' ? 'started' : 'paused'}`);
    } catch (error) {
      toast.error("Failed to update scraper");
    }
  };

  const deleteScraper = async (scraperId: string) => {
    try {
      const response = await fetch(`/api/trends/${scraperId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete scraper");
      }

      setScrapers(prev => prev.filter(s => s.id !== scraperId));
      toast.success("Scraper deleted successfully");
    } catch (error) {
      toast.error("Failed to delete scraper");
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <TrendsHeader />
      
      <TrendsFilters />
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/5 dark:bg-black/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-6 animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded w-3/4"></div>
                <div className="h-32 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded"></div>
                <div className="h-4 bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : scrapers.length > 0 ? (
        <ScrapersGrid 
          scrapers={scrapers} 
          onToggleScraper={toggleScraper}
          onDeleteScraper={deleteScraper}
        />
      ) : (
        <EmptyState
          icon={ScanSearch}
          title="No scrapers found"
          description="Start by creating a scraper to collect content from your favorite platforms"
          actionLabel="Create Scraper"
          actionHref="/trends/scrape"
        />
      )}
    </div>
  );
}