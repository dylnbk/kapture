import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Only create Redis connection in production
export const redis = process.env.NODE_ENV === 'production'
  ? (globalForRedis.redis ??
     new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
       maxRetriesPerRequest: 3,
       lazyConnect: true,
       connectTimeout: 10000,
       commandTimeout: 5000,
     }))
  : null as any; // Use null in development to prevent connections

if (process.env.NODE_ENV === 'production' && !globalForRedis.redis) {
  globalForRedis.redis = redis;
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

// TTL configuration (in seconds)
export const CACHE_TTL = {
  USER_SUBSCRIPTION: 300, // 5 minutes
  USER_USAGE: 60, // 1 minute
  TRENDS: 900, // 15 minutes
  DOWNLOAD_STATUS: 30, // 30 seconds
  AI_GENERATION: 3600, // 1 hour
  RATE_LIMIT: 60, // 1 minute
} as const;

// Cache interface
export interface CacheLayer {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Redis cache implementation
export class RedisCache implements CacheLayer {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushall();
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  async increment(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);
      if (ttl && value === 1) {
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }
}

// Create cache instance
export const cache = new RedisCache(redis);

// Rate limiting functions
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 60
): Promise<boolean> {
  const key = CACHE_KEYS.RATE_LIMIT(identifier);
  const current = await cache.increment(key, window);
  return current <= limit;
}

export async function getRateLimitInfo(identifier: string): Promise<{
  current: number;
  remaining: number;
  resetTime: number;
}> {
  const key = CACHE_KEYS.RATE_LIMIT(identifier);
  const current = await redis.get(key);
  const ttl = await redis.ttl(key);
  
  const currentCount = current ? parseInt(current) : 0;
  const resetTime = ttl > 0 ? Date.now() + (ttl * 1000) : Date.now();
  
  return {
    current: currentCount,
    remaining: Math.max(0, 100 - currentCount),
    resetTime,
  };
}

// Utility functions
function hashPrompt(prompt: string): string {
  // Simple hash function for caching AI responses
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Cache warming functions
export async function warmCache(userId: string) {
  try {
    // Pre-warm frequently accessed data
    const subscription = await cache.get(CACHE_KEYS.USER_SUBSCRIPTION(userId));
    if (!subscription) {
      // Load from database and cache
      const { getUserByClerkId } = await import('./db');
      const user = await getUserByClerkId(userId);
      if (user?.subscription) {
        await cache.set(
          CACHE_KEYS.USER_SUBSCRIPTION(userId),
          user.subscription,
          CACHE_TTL.USER_SUBSCRIPTION
        );
      }
    }
  } catch (error) {
    console.error('Cache warming error:', error);
  }
}

// Circuit breaker pattern for Redis operations
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Create circuit breaker instance for Redis operations
export const redisCircuitBreaker = new CircuitBreaker();