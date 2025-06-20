"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface ScrapeConfig {
  name: string;
  keywords: string[];
  hashtags: string[];
  urls: string[];
}

interface Scraper extends ScrapeConfig {
  id: string;
  isActive: boolean;
  createdAt: string;
  lastRun?: string;
  totalScraped: number;
  status: 'idle' | 'running' | 'paused' | 'error';
}

export function TrendsScrapeForm() {
  const [config, setConfig] = useState<ScrapeConfig>({
    name: "",
    keywords: [],
    hashtags: [],
    urls: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [scrapers, setScrapers] = useState<Scraper[]>([]);

  const addKeyword = () => {
    if (keywordInput.trim() && !config.keywords.includes(keywordInput.trim())) {
      setConfig(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setConfig(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !config.hashtags.includes(hashtagInput.trim())) {
      const hashtag = hashtagInput.trim().replace(/^#/, "");
      setConfig(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, hashtag]
      }));
      setHashtagInput("");
    }
  };

  const removeHashtag = (hashtag: string) => {
    setConfig(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(h => h !== hashtag)
    }));
  };

  const addUrl = () => {
    if (urlInput.trim() && !config.urls.includes(urlInput.trim())) {
      setConfig(prev => ({
        ...prev,
        urls: [...prev.urls, urlInput.trim()]
      }));
      setUrlInput("");
    }
  };

  const removeUrl = (url: string) => {
    setConfig(prev => ({
      ...prev,
      urls: prev.urls.filter(u => u !== url)
    }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.name.trim()) {
      toast.error("Please enter a scraper name");
      return;
    }

    if (config.keywords.length === 0 && config.hashtags.length === 0 && config.urls.length === 0) {
      toast.error("Please add at least one keyword, hashtag, or URL");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/trends/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error("Failed to create scraper");
      }

      const result = await response.json();
      toast.success("Scraper created successfully!");
      
      // Reset form
      setConfig({
        name: "",
        keywords: [],
        hashtags: [],
        urls: []
      });
      
      // Add to scrapers list (mock for now)
      const newScraper: Scraper = {
        ...config,
        id: Date.now().toString(),
        isActive: false,
        createdAt: new Date().toISOString(),
        totalScraped: 0,
        status: 'idle'
      };
      setScrapers(prev => [...prev, newScraper]);
      
    } catch (error) {
      console.error("Scraper creation error:", error);
      toast.error("Failed to create scraper. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Scraper Configuration</CardTitle>
            <CardDescription>
              Create a scraper to collect content from keywords, hashtags, or specific URLs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Scraper Name</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter a name for your scraper"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="keywords">Keywords</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Enter a keyword"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="hashtags">Hashtags</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="hashtags"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  placeholder="Enter a hashtag (with or without #)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addHashtag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.hashtags.map((hashtag) => (
                  <Badge key={hashtag} variant="secondary" className="flex items-center gap-1">
                    #{hashtag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeHashtag(hashtag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="urls">URLs</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="urls"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter a URL to scrape"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addUrl}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.urls.map((url) => (
                  <Badge key={url} variant="secondary" className="flex items-center gap-1">
                    {url.length > 30 ? `${url.substring(0, 30)}...` : url}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeUrl(url)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Scraper
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
        </div>
      </form>

      {/* Active Scrapers */}
      {scrapers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Scrapers</CardTitle>
            <CardDescription>
              Manage your active scrapers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scrapers.map((scraper) => (
                <div key={scraper.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{scraper.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {scraper.keywords.length} keywords, {scraper.hashtags.length} hashtags, {scraper.urls.length} URLs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total scraped: {scraper.totalScraped} items
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={scraper.status === 'running' ? 'default' : 'secondary'}>
                      {scraper.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleScraper(scraper.id)}
                    >
                      {scraper.status === 'running' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}