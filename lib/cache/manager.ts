import { getRedisClient, cacheKeys, cacheTTL } from './redis';

// In-memory cache fallback
const memoryCache = new Map<string, { value: any; expires: number }>();

// Memory cache cleanup interval (5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expires < now) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export class CacheManager {
  private static instance: CacheManager;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = await getRedisClient();
      
      if (redis) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
      }
      
      // Fallback to memory cache
      const item = memoryCache.get(key);
      if (item && item.expires > Date.now()) {
        return item.value;
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const redis = await getRedisClient();
      const serialized = JSON.stringify(value);
      
      if (redis) {
        if (ttlSeconds) {
          await redis.setEx(key, ttlSeconds, serialized);
        } else {
          await redis.set(key, serialized);
        }
      } else {
        // Fallback to memory cache
        const expires = ttlSeconds 
          ? Date.now() + (ttlSeconds * 1000)
          : Date.now() + (3600 * 1000); // Default 1 hour
        
        memoryCache.set(key, { value, expires });
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      
      if (redis) {
        await redis.del(key);
      }
      
      memoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      
      if (redis) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(keys);
        }
      }
      
      // Clear matching keys from memory cache
      for (const key of memoryCache.keys()) {
        if (this.matchesPattern(key, pattern)) {
          memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching for * wildcards
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      
      if (redis) {
        return (await redis.exists(key)) === 1;
      }
      
      const item = memoryCache.get(key);
      return item ? item.expires > Date.now() : false;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  // Specific cache methods for common operations
  async cacheVectorSearch<T>(
    query: string,
    limit: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = cacheKeys.vectorSearch(query, limit);
    return this.getOrSet(key, fetcher, cacheTTL.vectorSearch);
  }

  async cacheKBEntry<T>(
    id: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = cacheKeys.kbEntry(id);
    return this.getOrSet(key, fetcher, cacheTTL.kbEntry);
  }

  async cacheJiraTicket<T>(
    ticketKey: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = cacheKeys.jiraTicket(ticketKey);
    return this.getOrSet(key, fetcher, cacheTTL.jiraTicket);
  }

  async cacheEmbedding<T>(
    text: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = cacheKeys.embedding(text);
    return this.getOrSet(key, fetcher, cacheTTL.embedding);
  }

  // Cache invalidation methods
  async invalidateKBCache(): Promise<void> {
    await this.delPattern('kb_*');
  }

  async invalidateJiraCache(): Promise<void> {
    await this.delPattern('jira_*');
  }

  async invalidateVectorSearchCache(): Promise<void> {
    await this.delPattern('vector_search:*');
  }
}

export const cache = CacheManager.getInstance();