import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Download, Lightbulb, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityItem {
  id: string;
  type: "trend" | "download" | "ai_generation";
  title: string;
  description: string;
  timestamp: string;
  status: "completed" | "processing" | "failed";
  metadata?: {
    platform?: string;
    url?: string;
  };
}

// Mock data for demonstration
const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "trend",
    title: "YouTube Shorts Scraped",
    description: "Found 15 trending videos in Tech niche",
    timestamp: "2 minutes ago",
    status: "completed",
    metadata: { platform: "YouTube" },
  },
  {
    id: "2",
    type: "download",
    title: "Video Downloaded",
    description: "AI productivity tips compilation",
    timestamp: "5 minutes ago",
    status: "processing",
    metadata: { url: "https://youtube.com/watch?v=example" },
  },
  {
    id: "3",
    type: "ai_generation",
    title: "Hook Generated",
    description: "Created catchy hook for productivity video",
    timestamp: "12 minutes ago",
    status: "completed",
  },
  {
    id: "4",
    type: "trend",
    title: "TikTok Trends Scraped",
    description: "Found 8 trending videos in Lifestyle niche",
    timestamp: "1 hour ago",
    status: "completed",
    metadata: { platform: "TikTok" },
  },
];

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "trend":
      return TrendingUp;
    case "download":
      return Download;
    case "ai_generation":
      return Lightbulb;
    default:
      return Clock;
  }
}

function getStatusColor(status: ActivityItem["status"]) {
  switch (status) {
    case "completed":
      return "bg-green-500/20 text-green-600 border-green-500/30";
    case "processing":
      return "bg-blue-500/20 text-blue-600 border-blue-500/30";
    case "failed":
      return "bg-red-500/20 text-red-600 border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-600 border-gray-500/30";
  }
}

export function RecentActivity() {
  return (
    <Card className="border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            return (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={getStatusColor(activity.status)}
                      >
                        {activity.status}
                      </Badge>
                      {activity.metadata?.url && (
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {activity.timestamp}
                    </span>
                    {activity.metadata?.platform && (
                      <Badge variant="secondary" className="text-xs">
                        {activity.metadata.platform}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {mockActivities.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No recent activity
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start by scraping trends or downloading media
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}