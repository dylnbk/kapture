import { z } from "zod";

// Common validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

export const dateRangeSchema = z.object({
  dateRange: z.enum(['1d', '7d', '30d']).optional(),
});

// Authentication schemas
export const userSyncSchema = z.object({
  clerkUserId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

// Billing schemas
export const checkoutSessionSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const usageType = z.enum(['scrape', 'download', 'ai_generation']);

// Trends schemas
export const trendScrapeSchema = z.object({
  platform: z.enum(['youtube', 'tiktok', 'reddit', 'twitter']),
  keywords: z.array(z.string().min(1).max(100)).min(1).max(10),
  limit: z.number().min(1).max(100).default(10),
  filters: z.object({
    dateRange: z.enum(['1d', '7d', '30d']).optional(),
    minViews: z.number().min(0).optional(),
    language: z.string().optional(),
  }).optional(),
});

export const bulkScrapeSchema = z.object({
  platforms: z.array(z.enum(['youtube', 'tiktok', 'reddit', 'twitter'])),
  keywords: z.array(z.string().min(1).max(100)).min(1).max(10),
  limit: z.number().min(1).max(100).default(10),
});

// Download schemas
export const downloadRequestSchema = z.object({
  url: z.string().url(),
  fileType: z.enum(['video', 'audio', 'image']).optional(),
  quality: z.enum(['highest', 'high', 'medium', 'low']).default('high'),
  trendId: z.string().optional(),
});

export const bulkDownloadSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
  fileType: z.enum(['video', 'audio', 'image']).optional(),
  quality: z.enum(['highest', 'high', 'medium', 'low']).default('high'),
});

// AI schemas
export const aiGenerateSchema = z.object({
  prompt: z.string().min(1).max(4000),
  generationType: z.enum(['title', 'hook', 'script', 'description', 'hashtags']),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo']).default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
  ideaboardId: z.string().optional(),
});

export const aiIdeaboardSchema = z.object({
  topic: z.string().min(1).max(200),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'twitter']),
  audience: z.string().min(1).max(200),
  tone: z.enum(['professional', 'casual', 'humorous', 'educational', 'inspirational']),
});

// Ideaboard schemas
export const createIdeaboardSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  keywords: z.array(z.string()).max(10).default([]),
  creativity: z.number().min(1).max(10).default(7),
});

export const updateIdeaboardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  keywords: z.array(z.string()).max(10).optional(),
  creativity: z.number().min(1).max(10).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

// Library schemas
export const librarySearchSchema = z.object({
  query: z.string().min(1).max(200),
  fileType: z.enum(['video', 'audio', 'image']).optional(),
  platform: z.enum(['youtube', 'tiktok', 'reddit', 'twitter']).optional(),
  dateRange: z.enum(['1d', '7d', '30d', '90d']).optional(),
  ...paginationSchema.shape,
});

export const organizeLibrarySchema = z.object({
  mediaIds: z.array(z.string()).min(1).max(50),
  action: z.enum(['delete', 'archive', 'favorite']),
  tags: z.array(z.string()).optional(),
});

// Background job schemas
export const cancelJobSchema = z.object({
  jobId: z.string(),
});

// Error response schema
export const apiErrorSchema = z.object({
  code: z.enum([
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'RATE_LIMITED',
    'USAGE_EXCEEDED',
    'EXTERNAL_SERVICE_ERROR',
    'INTERNAL_SERVER_ERROR'
  ]),
  message: z.string(),
  details: z.any().optional(),
});

// Success response schema
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: apiErrorSchema.optional(),
  meta: z.object({
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }).optional(),
    usage: z.object({
      current: z.number(),
      limit: z.number(),
      remaining: z.number(),
    }).optional(),
  }).optional(),
});

// Type exports
export type PaginationInput = z.infer<typeof paginationSchema>;
export type TrendScrapeInput = z.infer<typeof trendScrapeSchema>;
export type DownloadRequestInput = z.infer<typeof downloadRequestSchema>;
export type AIGenerateInput = z.infer<typeof aiGenerateSchema>;
export type CreateIdeaboardInput = z.infer<typeof createIdeaboardSchema>;
export type UpdateIdeaboardInput = z.infer<typeof updateIdeaboardSchema>;
export type LibrarySearchInput = z.infer<typeof librarySearchSchema>;
export type UsageType = z.infer<typeof usageType>;