import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
process.env.JIRA_EMAIL = 'test@example.com';
process.env.JIRA_API_TOKEN = 'test-token';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test',
}));

vi.mock('next/headers', () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Setup test database connection mock
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('postgres', () => ({
  default: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn(),
  })),
}));

// Mock Redis
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn().mockResolvedValue(null),
  closeRedisConnection: vi.fn(),
  cacheKeys: {
    vectorSearch: (query: string, limit: number) => `vector_search:${Buffer.from(query).toString('base64')}:${limit}`,
    kbEntry: (id: string) => `kb_entry:${id}`,
    kbCategory: (id: string) => `kb_category:${id}`,
    kbList: (categoryId?: string, tags?: string[]) => `kb_list:${categoryId || 'all'}:${tags?.sort().join(',') || 'no_tags'}`,
    jiraTicket: (key: string) => `jira_ticket:${key}`,
    jiraSearch: (query: string, project?: string) => `jira_search:${Buffer.from(query).toString('base64')}:${project || 'all'}`,
    embedding: (text: string) => `embedding:${Buffer.from(text).toString('base64').slice(0, 50)}`,
    analytics: (type: string, period: string) => `analytics:${type}:${period}`,
  },
  cacheTTL: {
    vectorSearch: 300,
    kbEntry: 3600,
    kbCategory: 3600,
    kbList: 600,
    jiraTicket: 300,
    jiraSearch: 180,
    embedding: 86400,
    analytics: 1800,
  },
}));

// Mock AI embeddings
vi.mock('@/lib/ai/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

// Mock logger
vi.mock('@/lib/monitoring/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    logRequest: vi.fn(),
    logResponse: vi.fn(),
    logPerformance: vi.fn(),
    logSecurity: vi.fn(),
    logKBActivity: vi.fn(),
    logJiraActivity: vi.fn(),
    logAIActivity: vi.fn(),
  },
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});