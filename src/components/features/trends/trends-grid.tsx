"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, MessageCircle, Share, ExternalLink, Download } from "lucide-react";
import { Trend } from "@/types/trends";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface TrendsGridProps {
  trends: Trend[];
}

function TrendCard({ trend }: { trend: Trend }) {
  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "youtube":
        return "bg-red-500";
      case "tiktok":
        return "bg-black";
      case "reddit":
        return "bg-orange-500";
      case "twitter":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card variant="glass" className="group hover:scale-105 transition-all duration-200 overflow-hidden">
      <div className="relative">
        {trend.thumbnailUrl && (
          <div className="aspect-video relative overflow-hidden rounded-t-xl">
            <Image
              src={trend.thumbnailUrl}
              alt={trend.title}
              fill
              className="object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <Badge
              variant="secondary"
              className={`absolute top-3 left-3 ${getPlatformColor(trend.platform)} text-white border-0`}
            >
              {trend.platform.charAt(0).toUpperCase() + trend.platform.slice(1)}
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary line-clamp-2 leading-tight">
            {trend.title}
          </h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            by {trend.author}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-light-text-secondary dark:text-dark-text-secondary">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{formatNumber(trend.views)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="h-4 w-4" />
              <span>{formatNumber(trend.likes)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>{formatNumber(trend.comments)}</span>
            </div>
          </div>
          <span className="text-xs">
            {formatDistanceToNow(new Date(trend.scrapedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Hashtags */}
        {trend.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trend.hashtags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {trend.hashtags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{trend.hashtags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button variant="glass" size="sm" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendsGrid({ trends }: TrendsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trends.map((trend) => (
        <TrendCard key={trend.id} trend={trend} />
      ))}
    </div>
  );
}