export interface Trend {
  id: string;
  platform: 'youtube' | 'tiktok' | 'reddit' | 'twitter';
  contentType: 'video' | 'post' | 'comment';
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  author: string;
  likes: number;
  views: number;
  shares: number;
  comments: number;
  hashtags: string[];
  metadata: Record<string, any>;
  scrapedAt: string;
  createdAt: string;
}

export interface TrendFilters {
  platform?: Trend['platform'];
  contentType?: Trend['contentType'];
  dateRange?: 'today' | 'week' | 'month' | 'all';
  sortBy?: 'views' | 'likes' | 'recent' | 'engagement';
  search?: string;
}