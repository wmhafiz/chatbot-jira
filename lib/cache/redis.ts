import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

let redis: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) {
    console.warn('Redis URL not configured, caching disabled');
    return null;
  }

  if (!redis) {
    try {
      redis = createClient({
        url: process.env.REDIS_URL
      });
      
      redis.on('error', (err: Error) => {
        console.error('Redis connection error:', err);
      });

      redis.on('connect', () => {
        console.log('Redis connected successfully');
      });

      await redis.connect();
      
      // Test connection
      await redis.ping();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      redis = null;
    }
  }

  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.disconnect();
    redis = null;
  }
}

// Cache key generators
export const cacheKeys = {
  vectorSearch: (query: string, limit: number) => 
    `vector_search:${Buffer.from(query).toString('base64')}:${limit}`,
  kbEntry: (id: string) => `kb_entry:${id}`,
  kbCategory: (id: string) => `kb_category:${id}`,
  kbList: (categoryId?: string, tags?: string[]) => 
    `kb_list:${categoryId || 'all'}:${tags?.sort().join(',') || 'no_tags'}`,
  jiraTicket: (key: string) => `jira_ticket:${key}`,
  jiraSearch: (query: string, project?: string) => 
    `jira_search:${Buffer.from(query).toString('base64')}:${project || 'all'}`,
  embedding: (text: string) => 
    `embedding:${Buffer.from(text).toString('base64').slice(0, 50)}`,
  analytics: (type: string, period: string) => 
    `analytics:${type}:${period}`,
} as const;

// Default TTL values (in seconds)
export const cacheTTL = {
  vectorSearch: 300, // 5 minutes
  kbEntry: 3600, // 1 hour
  kbCategory: 3600, // 1 hour
  kbList: 600, // 10 minutes
  jiraTicket: 300, // 5 minutes
  jiraSearch: 180, // 3 minutes
  embedding: 86400, // 24 hours
  analytics: 1800, // 30 minutes
} as const;