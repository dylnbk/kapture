// Development-friendly Redis replacement that bypasses all Redis operations
export interface CacheLayer {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  increment?(key: string, ttl?: number): Promise<number>;
  exists?(key: string): Promise<boolean>;
}

// No-op cache implementation for development
export class DevCache implements CacheLayer {
  async get<T>(key: string): Promise<T | null> {
    console.log(`[DEV CACHE] Skipping cache get for key: ${key}`);
    return null;
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    console.log(`[DEV CACHE] Skipping cache set for key: ${key}`);
  }

  async delete(key: string): Promise<void> {
    console.log(`[DEV CACHE] Skipping cache delete for key: ${key}`);
  }

  async clear(): Promise<void> {
    console.log(`[DEV CACHE] Skipping cache clear`);
  }

  async increment(key: string, ttl?: number): Promise<number> {
    console.log(`[DEV CACHE] Skipping cache increment for key: ${key}`);
    return 1;
  }

  async exists(key: string): Promise<boolean> {
    console.log(`[DEV CACHE] Skipping cache exists for key: ${key}`);
    return false;
  }
}

// Cache key patterns
export const CACHE_KEYS = {
  USER_SUBSCRIPTION: (userId: string) => `user:${userId}:subscription`,
  USER_USAGE: (userId: string, period: string) => `user:${userId}:usage:${period}`,
  TRENDS: (userId: string, platform: string) => `trends:${userId}:${platform}`,
  DOWNLOAD_STATUS: (jobId: string) => `download:${jobId}:status`,
  AI_GENERATION: (prompt: string) => `ai:${hashPrompt(prompt)}`,
  RATE_LIMIT: (identifier: string) => `rate_limit:${identifier}`,
} as const;

// TTL configuration (in seconds) - kept for compatibility
export const CACHE_TTL = {
  USER_SUBSCRIPTION: 300,
  USER_USAGE: 60,
  TRENDS: 900,
  DOWNLOAD_STATUS: 30,
  AI_GENERATION: 3600,
  RATE_LIMIT: 60,
} as const;

// Development cache instance
export const cache = new DevCache();

// Development circuit breaker that always succeeds
export class DevCircuitBreaker {
  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000
  ) {
    console.log(`[DEV CIRCUIT BREAKER] Initialized with threshold=${failureThreshold}, timeout=${timeout}`);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    console.log('[DEV CIRCUIT BREAKER] Executing operation without circuit breaking');
    return await operation();
  }
}

// Rate limiting functions - return permissive values for development
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 60
): Promise<boolean> {
  console.log(`[DEV RATE LIMIT] Allowing request for ${identifier}`);
  return true;
}

export async function getRateLimitInfo(identifier: string): Promise<{
  current: number;
  remaining: number;
  resetTime: number;
}> {
  console.log(`[DEV RATE LIMIT] Returning permissive rate limit info for ${identifier}`);
  return {
    current: 1,
    remaining: 99,
    resetTime: Date.now() + 60000,
  };
}

// Utility functions
function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// No-op cache warming
export async function warmCache(userId: string) {
  console.log(`[DEV CACHE] Skipping cache warming for user ${userId}`);
}

// Export the circuit breaker
export const CircuitBreaker = DevCircuitBreaker;
export const redisCircuitBreaker = new DevCircuitBreaker();