import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from '@/lib/cache/manager';

// Mock Redis
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn().mockResolvedValue(null), // Simulate Redis not available
  cacheKeys: {
    vectorSearch: (query: string, limit: number) => `vector_search:${Buffer.from(query).toString('base64')}:${limit}`,
    kbEntry: (id: string) => `kb_entry:${id}`,
    jiraTicket: (key: string) => `jira_ticket:${key}`,
  },
  cacheTTL: {
    vectorSearch: 300,
    kbEntry: 3600,
    jiraTicket: 300,
  }
}));

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = CacheManager.getInstance();
  });

  afterEach(() => {
    // Clear any timers or cleanup
    vi.clearAllTimers();
  });

  describe('Memory Cache Fallback', () => {
    it('should store and retrieve data from memory cache when Redis is unavailable', async () => {
      const testKey = 'test_key';
      const testValue = { data: 'test_data', number: 42 };

      await cache.set(testKey, testValue, 60);
      const retrieved = await cache.get(testKey);

      expect(retrieved).toEqual(testValue);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non_existent_key');
      expect(result).toBeNull();
    });

    it('should handle TTL expiration in memory cache', async () => {
      vi.useFakeTimers();
      
      const testKey = 'expiring_key';
      const testValue = { data: 'expires_soon' };

      await cache.set(testKey, testValue, 1); // 1 second TTL
      
      // Should exist immediately
      let result = await cache.get(testKey);
      expect(result).toEqual(testValue);

      // Fast forward time beyond TTL
      vi.advanceTimersByTime(2000);

      // Should be expired
      result = await cache.get(testKey);
      expect(result).toBeNull();

      vi.useRealTimers();
    });

    it('should delete keys correctly', async () => {
      const testKey = 'delete_test';
      const testValue = { data: 'to_be_deleted' };

      await cache.set(testKey, testValue);
      let result = await cache.get(testKey);
      expect(result).toEqual(testValue);

      await cache.del(testKey);
      result = await cache.get(testKey);
      expect(result).toBeNull();
    });

    it('should check key existence correctly', async () => {
      const testKey = 'existence_test';
      const testValue = { data: 'exists' };

      let exists = await cache.exists(testKey);
      expect(exists).toBe(false);

      await cache.set(testKey, testValue);
      exists = await cache.exists(testKey);
      expect(exists).toBe(true);

      await cache.del(testKey);
      exists = await cache.exists(testKey);
      expect(exists).toBe(false);
    });
  });

  describe('getOrSet functionality', () => {
    it('should fetch and cache data when key does not exist', async () => {
      const testKey = 'fetch_test';
      const expectedValue = { fetched: true, timestamp: Date.now() };
      
      const fetcher = vi.fn().mockResolvedValue(expectedValue);

      const result = await cache.getOrSet(testKey, fetcher, 60);

      expect(fetcher).toHaveBeenCalledOnce();
      expect(result).toEqual(expectedValue);

      // Verify it's cached
      const cachedResult = await cache.get(testKey);
      expect(cachedResult).toEqual(expectedValue);
    });

    it('should return cached data without calling fetcher', async () => {
      const testKey = 'cached_fetch_test';
      const cachedValue = { cached: true };
      const fetcherValue = { fetched: true };

      // Pre-populate cache
      await cache.set(testKey, cachedValue);

      const fetcher = vi.fn().mockResolvedValue(fetcherValue);
      const result = await cache.getOrSet(testKey, fetcher, 60);

      expect(fetcher).not.toHaveBeenCalled();
      expect(result).toEqual(cachedValue);
    });

    it('should handle fetcher errors gracefully', async () => {
      const testKey = 'error_fetch_test';
      const error = new Error('Fetcher failed');
      
      const fetcher = vi.fn().mockRejectedValue(error);

      await expect(cache.getOrSet(testKey, fetcher, 60)).rejects.toThrow('Fetcher failed');
      expect(fetcher).toHaveBeenCalledOnce();

      // Verify nothing was cached
      const result = await cache.get(testKey);
      expect(result).toBeNull();
    });
  });

  describe('Specialized cache methods', () => {
    it('should cache vector search results', async () => {
      const query = 'test search query';
      const limit = 10;
      const searchResults = [{ id: '1', title: 'Result 1' }, { id: '2', title: 'Result 2' }];

      const fetcher = vi.fn().mockResolvedValue(searchResults);

      const result = await cache.cacheVectorSearch(query, limit, fetcher);

      expect(fetcher).toHaveBeenCalledOnce();
      expect(result).toEqual(searchResults);

      // Verify it's cached with correct key
      const cacheKey = `vector_search:${Buffer.from(query).toString('base64')}:${limit}`;
      const cached = await cache.get(cacheKey);
      expect(cached).toEqual(searchResults);
    });

    it('should cache KB entries', async () => {
      const articleId = 'article_123';
      const articleData = { id: articleId, title: 'Test Article', content: 'Test content' };

      const fetcher = vi.fn().mockResolvedValue(articleData);

      const result = await cache.cacheKBEntry(articleId, fetcher);

      expect(fetcher).toHaveBeenCalledOnce();
      expect(result).toEqual(articleData);

      // Verify it's cached with correct key
      const cached = await cache.get(`kb_entry:${articleId}`);
      expect(cached).toEqual(articleData);
    });

    it('should cache Jira tickets', async () => {
      const ticketKey = 'PROJ-123';
      const ticketData = { key: ticketKey, summary: 'Test ticket', status: 'Open' };

      const fetcher = vi.fn().mockResolvedValue(ticketData);

      const result = await cache.cacheJiraTicket(ticketKey, fetcher);

      expect(fetcher).toHaveBeenCalledOnce();
      expect(result).toEqual(ticketData);

      // Verify it's cached with correct key
      const cached = await cache.get(`jira_ticket:${ticketKey}`);
      expect(cached).toEqual(ticketData);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate KB cache patterns', async () => {
      // Set up some KB-related cache entries
      await cache.set('kb_entry:1', { id: '1' });
      await cache.set('kb_list:category1', [{ id: '1' }]);
      await cache.set('kb_popular:10', [{ id: '1' }]);
      await cache.set('other_cache:test', { data: 'should_remain' });

      await cache.invalidateKBCache();

      // KB entries should be cleared
      expect(await cache.get('kb_entry:1')).toBeNull();
      expect(await cache.get('kb_list:category1')).toBeNull();
      expect(await cache.get('kb_popular:10')).toBeNull();

      // Other cache entries should remain
      expect(await cache.get('other_cache:test')).toEqual({ data: 'should_remain' });
    });

    it('should invalidate Jira cache patterns', async () => {
      // Set up some Jira-related cache entries
      await cache.set('jira_ticket:PROJ-1', { key: 'PROJ-1' });
      await cache.set('jira_search:test', [{ key: 'PROJ-1' }]);
      await cache.set('jira_open:50', [{ key: 'PROJ-1' }]);
      await cache.set('other_cache:test', { data: 'should_remain' });

      await cache.invalidateJiraCache();

      // Jira entries should be cleared
      expect(await cache.get('jira_ticket:PROJ-1')).toBeNull();
      expect(await cache.get('jira_search:test')).toBeNull();
      expect(await cache.get('jira_open:50')).toBeNull();

      // Other cache entries should remain
      expect(await cache.get('other_cache:test')).toEqual({ data: 'should_remain' });
    });
  });

  describe('Pattern matching', () => {
    it('should match simple wildcard patterns', async () => {
      await cache.set('test_prefix_1', { id: 1 });
      await cache.set('test_prefix_2', { id: 2 });
      await cache.set('other_prefix_1', { id: 3 });

      await cache.delPattern('test_prefix_*');

      expect(await cache.get('test_prefix_1')).toBeNull();
      expect(await cache.get('test_prefix_2')).toBeNull();
      expect(await cache.get('other_prefix_1')).toEqual({ id: 3 });
    });
  });
});