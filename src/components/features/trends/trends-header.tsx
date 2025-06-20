import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanSearch, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

export function TrendsHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center space-x-3">
        <ScanSearch className="h-8 w-8 text-light-text-primary dark:text-dark-text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Scraping
          </h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Link href="/trends/scrape">
          <Button variant="glass">
            <Plus className="h-4 w-4 mr-2" />
            Create Scraper
          </Button>
        </Link>
      </div>
    </div>
  );
}