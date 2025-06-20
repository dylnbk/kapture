"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Settings, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface ScrapersGridProps {
  scrapers: Scraper[];
  onToggleScraper: (id: string) => void;
  onDeleteScraper: (id: string) => void;
}

function ScraperCard({ scraper, onToggleScraper, onDeleteScraper }: { 
  scraper: Scraper; 
  onToggleScraper: (id: string) => void;
  onDeleteScraper: (id: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const totalTargets = scraper.keywords.length + scraper.hashtags.length + scraper.urls.length;

  return (
    <Card variant="glass" className="group hover:scale-105 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
              {scraper.name}
            </h3>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`${getStatusColor(scraper.status)} text-white border-0`}
              >
                {scraper.status}
              </Badge>
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {totalTargets} targets
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteScraper(scraper.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Targets Summary */}
        <div className="space-y-2">
          {scraper.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Keywords:</span>
              {scraper.keywords.slice(0, 3).map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {scraper.keywords.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{scraper.keywords.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {scraper.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Hashtags:</span>
              {scraper.hashtags.slice(0, 3).map((hashtag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{hashtag}
                </Badge>
              ))}
              {scraper.hashtags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{scraper.hashtags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {scraper.urls.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">URLs:</span>
              {scraper.urls.slice(0, 2).map((url, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {url.length > 20 ? `${url.substring(0, 20)}...` : url}
                </Badge>
              ))}
              {scraper.urls.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{scraper.urls.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-light-text-secondary dark:text-dark-text-secondary">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="font-medium">{scraper.totalScraped}</span>
              <span>scraped</span>
            </div>
            {scraper.lastRun && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatDistanceToNow(new Date(scraper.lastRun), { addSuffix: true })}</span>
              </div>
            )}
          </div>
          <span className="text-xs">
            Created {formatDistanceToNow(new Date(scraper.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onToggleScraper(scraper.id)}
          >
            {scraper.status === 'running' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScrapersGrid({ scrapers, onToggleScraper, onDeleteScraper }: ScrapersGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {scrapers.map((scraper) => (
        <ScraperCard 
          key={scraper.id} 
          scraper={scraper} 
          onToggleScraper={onToggleScraper}
          onDeleteScraper={onDeleteScraper}
        />
      ))}
    </div>
  );
}