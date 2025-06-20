"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";
import { useState } from "react";
import { TrendFilters } from "@/types/trends";

interface TrendsFiltersProps {
  filters?: TrendFilters;
  onFiltersChange?: (filters: TrendFilters) => void;
}

export function TrendsFilters({ filters = {}, onFiltersChange }: TrendsFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [showFilters, setShowFilters] = useState(false);

  const platforms = [
    { value: "youtube", label: "YouTube", color: "bg-red-500" },
    { value: "tiktok", label: "TikTok", color: "bg-black" },
    { value: "reddit", label: "Reddit", color: "bg-orange-500" },
    { value: "twitter", label: "Twitter", color: "bg-blue-500" },
  ];

  const contentTypes = [
    { value: "video", label: "Video" },
    { value: "post", label: "Post" },
    { value: "comment", label: "Comment" },
  ];

  const dateRanges = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "all", label: "All Time" },
  ];

  const sortOptions = [
    { value: "recent", label: "Most Recent" },
    { value: "views", label: "Most Views" },
    { value: "likes", label: "Most Likes" },
    { value: "engagement", label: "Most Engagement" },
  ];

  const handleFilterChange = (key: keyof TrendFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange?.(newFilters);
  };

  const clearFilters = () => {
    setSearchQuery("");
    onFiltersChange?.({});
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <Card variant="glass" className="p-4">
      <div className="space-y-4">
        {/* Search and Filter Toggle */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text-secondary dark:text-dark-text-secondary" />
            <Input
              placeholder="Search trends..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFilterChange("search", e.target.value);
              }}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-light-border dark:border-dark-border">
            {/* Platforms */}
            <div>
              <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2 block">
                Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <Button
                    key={platform.value}
                    variant={filters.platform === platform.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange("platform", platform.value)}
                    className="h-8"
                  >
                    <div className={`w-2 h-2 rounded-full ${platform.color} mr-2`} />
                    {platform.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Content Types */}
            <div>
              <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2 block">
                Content Type
              </label>
              <div className="flex flex-wrap gap-2">
                {contentTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={filters.contentType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange("contentType", type.value)}
                    className="h-8"
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2 block">
                Date Range
              </label>
              <div className="flex flex-wrap gap-2">
                {dateRanges.map((range) => (
                  <Button
                    key={range.value}
                    variant={filters.dateRange === range.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange("dateRange", range.value)}
                    className="h-8"
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2 block">
                Sort By
              </label>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.sortBy === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange("sortBy", option.value)}
                    className="h-8"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}