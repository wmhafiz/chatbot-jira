import { logger } from './logger';
import { cache } from '../cache/manager';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  context?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  vectorSearch: number; // ms
  dbQuery: number; // ms
  apiCall: number; // ms
  pageLoad: number; // ms
  memoryUsage: number; // percentage
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThresholds;
  private timers: Map<string, number> = new Map();

  constructor() {
    this.thresholds = {
      vectorSearch: 500,
      dbQuery: 100,
      apiCall: 2000,
      pageLoad: 3000,
      memoryUsage: 80
    };
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  endTimer(name: string, context?: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      logger.warn(`Timer ${name} was not started`, 'PERFORMANCE');
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      context,
      metadata
    });

    return duration;
  }

  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Check thresholds
    this.checkThreshold(metric);

    // Log performance metric
    logger.logPerformance(metric.name, metric.value, metric.context, metric.metadata);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private checkThreshold(metric: PerformanceMetric): void {
    let threshold: number | undefined;

    switch (metric.name) {
      case 'vector_search':
        threshold = this.thresholds.vectorSearch;
        break;
      case 'db_query':
        threshold = this.thresholds.dbQuery;
        break;
      case 'api_call':
        threshold = this.thresholds.apiCall;
        break;
      case 'page_load':
        threshold = this.thresholds.pageLoad;
        break;
      case 'memory_usage':
        threshold = this.thresholds.memoryUsage;
        break;
    }

    if (threshold && metric.value > threshold) {
      logger.warn(
        `Performance threshold exceeded: ${metric.name} took ${metric.value}${metric.unit} (threshold: ${threshold}${metric.unit})`,
        'PERFORMANCE_ALERT',
        {
          metric: metric.name,
          value: metric.value,
          threshold,
          unit: metric.unit,
          ...metric.metadata
        }
      );
    }
  }

  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    context?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(name);
    try {
      const result = await operation();
      this.endTimer(name, context, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, context, { ...metadata, error: true });
      throw error;
    }
  }

  measureSync<T>(
    name: string,
    operation: () => T,
    context?: string,
    metadata?: Record<string, any>
  ): T {
    this.startTimer(name);
    try {
      const result = operation();
      this.endTimer(name, context, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, context, { ...metadata, error: true });
      throw error;
    }
  }

  getMetrics(name?: string, since?: Date): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }

    return filtered;
  }

  getAverageMetric(name: string, since?: Date): number {
    const metrics = this.getMetrics(name, since);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  getPercentileMetric(name: string, percentile: number, since?: Date): number {
    const metrics = this.getMetrics(name, since);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  async getSystemMetrics(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  }> {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // Record memory usage metric
    this.recordMetric({
      name: 'memory_usage',
      value: memoryUsagePercent,
      unit: 'percentage',
      timestamp: new Date(),
      context: 'SYSTEM',
      metadata: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      }
    });

    return {
      memoryUsage: memoryUsagePercent,
      cpuUsage: 0, // Would need additional library for CPU usage
      uptime: process.uptime()
    };
  }

  async generatePerformanceReport(hours = 24): Promise<{
    summary: {
      totalRequests: number;
      averageResponseTime: number;
      p95ResponseTime: number;
      errorRate: number;
    };
    slowestOperations: Array<{
      name: string;
      averageTime: number;
      maxTime: number;
      count: number;
    }>;
    systemHealth: {
      memoryUsage: number;
      uptime: number;
    };
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const allMetrics = this.getMetrics(undefined, since);

    // Group metrics by operation
    const operationStats = new Map<string, { times: number[]; errors: number }>();
    
    allMetrics.forEach(metric => {
      if (!operationStats.has(metric.name)) {
        operationStats.set(metric.name, { times: [], errors: 0 });
      }
      
      const stats = operationStats.get(metric.name)!;
      stats.times.push(metric.value);
      
      if (metric.metadata?.error) {
        stats.errors++;
      }
    });

    // Calculate summary
    const allResponseTimes = allMetrics
      .filter(m => m.unit === 'ms')
      .map(m => m.value);
    
    const totalRequests = allResponseTimes.length;
    const averageResponseTime = totalRequests > 0 
      ? allResponseTimes.reduce((a, b) => a + b, 0) / totalRequests 
      : 0;
    
    const sortedTimes = allResponseTimes.sort((a, b) => a - b);
    const p95Index = Math.ceil(0.95 * sortedTimes.length) - 1;
    const p95ResponseTime = sortedTimes[Math.max(0, p95Index)] || 0;

    const totalErrors = Array.from(operationStats.values())
      .reduce((sum, stats) => sum + stats.errors, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Find slowest operations
    const slowestOperations = Array.from(operationStats.entries())
      .map(([name, stats]) => ({
        name,
        averageTime: stats.times.reduce((a, b) => a + b, 0) / stats.times.length,
        maxTime: Math.max(...stats.times),
        count: stats.times.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    const systemHealth = await this.getSystemMetrics();

    return {
      summary: {
        totalRequests,
        averageResponseTime,
        p95ResponseTime,
        errorRate
      },
      slowestOperations,
      systemHealth
    };
  }

  async cachePerformanceReport(): Promise<void> {
    const report = await this.generatePerformanceReport();
    await cache.set('performance_report', report, 300); // Cache for 5 minutes
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility functions for common measurements
export async function measureVectorSearch<T>(
  operation: () => Promise<T>,
  query?: string
): Promise<T> {
  return performanceMonitor.measureAsync(
    'vector_search',
    operation,
    'VECTOR_SEARCH',
    { query: query?.substring(0, 100) }
  );
}

export async function measureDbQuery<T>(
  operation: () => Promise<T>,
  queryType?: string
): Promise<T> {
  return performanceMonitor.measureAsync(
    'db_query',
    operation,
    'DATABASE',
    { queryType }
  );
}

export async function measureApiCall<T>(
  operation: () => Promise<T>,
  endpoint?: string,
  method?: string
): Promise<T> {
  return performanceMonitor.measureAsync(
    'api_call',
    operation,
    'API',
    { endpoint, method }
  );
}