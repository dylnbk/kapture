import { ApifyApi } from 'apify-client';
import { CircuitBreaker } from '../lib/redis-dev';

export interface ApifyRunOptions {
  waitForFinish?: number;
  memory?: number;
  timeout?: number;
}

export interface YouTubeScrapeParams {
  searchTerms: string[];
  maxResults: number;
  language?: string;
  country?: string;
  publishedAfter?: string;
  publishedBefore?: string;
}

export interface TikTokScrapeParams {
  searchTerms: string[];
  maxResults: number;
  language?: string;
  country?: string;
}

export interface RedditScrapeParams {
  subreddits: string[];
  searchTerms: string[];
  maxResults: number;
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

export interface TwitterScrapeParams {
  searchTerms: string[];
  maxResults: number;
  language?: string;
  resultType?: 'recent' | 'popular' | 'mixed';
}

export interface ScrapedContent {
  id: string;
  platform: string;
  contentType: string;
  title?: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  author?: string;
  likes: number;
  views: number;
  shares: number;
  comments: number;
  hashtags: string[];
  metadata: Record<string, any>;
  scrapedAt: Date;
}

class ApifyService {
  private client: ApifyApi;
  private circuitBreaker: InstanceType<typeof CircuitBreaker>;

  constructor() {
    this.client = new ApifyApi({
      token: process.env.APIFY_API_TOKEN,
    });
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  private async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }

  async scrapeYouTube(params: YouTubeScrapeParams, options?: ApifyRunOptions): Promise<ScrapedContent[]> {
    return this.executeWithCircuitBreaker(async () => {
      const run = await this.client.actor('dtrungtin/youtube-scraper').call({
        searchTerms: params.searchTerms,
        maxResults: params.maxResults,
        language: params.language || 'en',
        country: params.country || 'US',
        publishedAfter: params.publishedAfter,
        publishedBefore: params.publishedBefore,
      }, {
        memory: options?.memory || 1024,
        timeout: options?.timeout || 300,
        waitForFinish: options?.waitForFinish || 120,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      return items.map((item: any) => ({
        id: item.id || item.videoId,
        platform: 'youtube',
        contentType: 'video',
        title: item.title,
        description: item.description,
        url: item.url || `https://www.youtube.com/watch?v=${item.videoId}`,
        thumbnailUrl: item.thumbnail?.url || item.thumbnailUrl,
        author: item.channel?.name || item.channelName,
        likes: parseInt(item.likes) || 0,
        views: parseInt(item.views) || 0,
        shares: 0,
        comments: parseInt(item.comments) || 0,
        hashtags: this.extractHashtags(item.title + ' ' + item.description),
        metadata: {
          duration: item.duration,
          publishedAt: item.publishedAt,
          channelId: item.channel?.id || item.channelId,
          categoryId: item.categoryId,
        },
        scrapedAt: new Date(),
      }));
    });
  }

  async scrapeTikTok(params: TikTokScrapeParams, options?: ApifyRunOptions): Promise<ScrapedContent[]> {
    return this.executeWithCircuitBreaker(async () => {
      const run = await this.client.actor('clockworks/tiktok-scraper').call({
        searchTerms: params.searchTerms,
        maxResults: params.maxResults,
        language: params.language || 'en',
        country: params.country || 'US',
      }, {
        memory: options?.memory || 1024,
        timeout: options?.timeout || 300,
        waitForFinish: options?.waitForFinish || 120,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      return items.map((item: any) => ({
        id: item.id || item.videoId,
        platform: 'tiktok',
        contentType: 'video',
        title: item.title || item.description,
        description: item.description,
        url: item.url || item.videoUrl,
        thumbnailUrl: item.thumbnail || item.cover,
        author: item.author?.name || item.authorName,
        likes: parseInt(item.likes) || 0,
        views: parseInt(item.views) || 0,
        shares: parseInt(item.shares) || 0,
        comments: parseInt(item.comments) || 0,
        hashtags: item.hashtags || this.extractHashtags(item.description),
        metadata: {
          duration: item.duration,
          publishedAt: item.publishedAt || item.createTime,
          authorId: item.author?.id || item.authorId,
          music: item.music,
        },
        scrapedAt: new Date(),
      }));
    });
  }

  async scrapeReddit(params: RedditScrapeParams, options?: ApifyRunOptions): Promise<ScrapedContent[]> {
    return this.executeWithCircuitBreaker(async () => {
      const run = await this.client.actor('trudax/reddit-scraper').call({
        subreddits: params.subreddits,
        searchTerms: params.searchTerms,
        maxResults: params.maxResults,
        timeframe: params.timeframe || 'week',
      }, {
        memory: options?.memory || 1024,
        timeout: options?.timeout || 300,
        waitForFinish: options?.waitForFinish || 120,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      return items.map((item: any) => ({
        id: item.id,
        platform: 'reddit',
        contentType: 'post',
        title: item.title,
        description: item.text || item.selftext,
        url: item.url || `https://reddit.com${item.permalink}`,
        thumbnailUrl: item.thumbnail !== 'self' ? item.thumbnail : undefined,
        author: item.author,
        likes: parseInt(item.ups) || 0,
        views: 0,
        shares: 0,
        comments: parseInt(item.num_comments) || 0,
        hashtags: this.extractHashtags(item.title + ' ' + (item.text || '')),
        metadata: {
          subreddit: item.subreddit,
          score: item.score,
          upvoteRatio: item.upvote_ratio,
          gilded: item.gilded,
          createdAt: new Date(item.created_utc * 1000),
        },
        scrapedAt: new Date(),
      }));
    });
  }

  async scrapeTwitter(params: TwitterScrapeParams, options?: ApifyRunOptions): Promise<ScrapedContent[]> {
    return this.executeWithCircuitBreaker(async () => {
      const run = await this.client.actor('quacker/twitter-scraper').call({
        searchTerms: params.searchTerms,
        maxResults: params.maxResults,
        language: params.language || 'en',
        resultType: params.resultType || 'recent',
      }, {
        memory: options?.memory || 1024,
        timeout: options?.timeout || 300,
        waitForFinish: options?.waitForFinish || 120,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      return items.map((item: any) => ({
        id: item.id || item.tweetId,
        platform: 'twitter',
        contentType: 'post',
        title: item.text,
        description: item.text,
        url: item.url || `https://twitter.com/${item.user?.screen_name}/status/${item.id}`,
        thumbnailUrl: item.media?.[0]?.media_url_https,
        author: item.user?.name || item.user?.screen_name,
        likes: parseInt(item.favorite_count) || 0,
        views: 0,
        shares: parseInt(item.retweet_count) || 0,
        comments: parseInt(item.reply_count) || 0,
        hashtags: item.hashtags || this.extractHashtags(item.text),
        metadata: {
          userId: item.user?.id,
          screenName: item.user?.screen_name,
          createdAt: new Date(item.created_at),
          lang: item.lang,
          retweeted: item.retweeted,
          media: item.media,
        },
        scrapedAt: new Date(),
      }));
    });
  }

  async getRunStatus(runId: string) {
    return this.executeWithCircuitBreaker(async () => {
      return await this.client.run(runId).get();
    });
  }

  async getRunResults(runId: string) {
    return this.executeWithCircuitBreaker(async () => {
      const run = await this.client.run(runId).get();
      if (run.status !== 'SUCCEEDED') {
        throw new Error(`Run ${runId} has status: ${run.status}`);
      }
      
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      return items;
    });
  }

  private extractHashtags(text: string): string[] {
    if (!text) return [];
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  }
}

export const apifyService = new ApifyService();