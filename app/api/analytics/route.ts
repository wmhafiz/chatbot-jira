import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsQueries } from '@/lib/db/optimized-queries';
import { healthMonitor } from '@/lib/monitoring/health';
import { performanceMonitor } from '@/lib/monitoring/performance';
import { logger } from '@/lib/monitoring/logger';
import { cache } from '@/lib/cache/manager';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const cacheKey = `analytics_dashboard:${days}`;

    // Check cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Log the analytics request
    await logger.logRequest(
      'GET',
      '/api/analytics',
      undefined,
      undefined,
      request.headers.get('x-request-id') || undefined,
      { days }
    );

    // Fetch all analytics data in parallel
    const [kbStats, chatStats, jiraStats, systemHealth, performanceReport] = await Promise.all([
      AnalyticsQueries.getKBUsageStats(days),
      AnalyticsQueries.getChatUsageStats(days),
      AnalyticsQueries.getJiraIntegrationStats(days),
      healthMonitor.getCachedHealth() || healthMonitor.performHealthCheck(),
      performanceMonitor.generatePerformanceReport(Math.min(days * 24, 168)) // Max 7 days for performance
    ]);

    const analyticsData = {
      kbStats,
      chatStats,
      jiraStats,
      systemHealth,
      performance: performanceReport,
      generatedAt: new Date().toISOString(),
      period: `${days} days`
    };

    // Cache the result for 5 minutes
    await cache.set(cacheKey, analyticsData, 300);

    const responseTime = Date.now() - startTime;

    // Log the response
    await logger.logResponse(
      'GET',
      '/api/analytics',
      200,
      responseTime,
      undefined,
      undefined,
      request.headers.get('x-request-id') || undefined
    );

    // Record performance metric
    performanceMonitor.recordMetric({
      name: 'analytics_api',
      value: responseTime,
      unit: 'ms',
      timestamp: new Date(),
      context: 'API',
      metadata: { days }
    });

    return NextResponse.json(analyticsData);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    await logger.error(
      'Analytics API failed',
      error instanceof Error ? error : new Error(String(error)),
      'API',
      { responseTime }
    );

    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export endpoint for specific analytics data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, params } = body;

    let result;

    switch (type) {
      case 'kb_usage':
        result = await AnalyticsQueries.getKBUsageStats(params?.days || 30);
        break;
      case 'chat_usage':
        result = await AnalyticsQueries.getChatUsageStats(params?.days || 30);
        break;
      case 'jira_stats':
        result = await AnalyticsQueries.getJiraIntegrationStats(params?.days || 30);
        break;
      case 'performance':
        result = await performanceMonitor.generatePerformanceReport(params?.hours || 24);
        break;
      case 'health':
        result = await healthMonitor.performHealthCheck();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error) {
    await logger.error(
      'Analytics POST API failed',
      error instanceof Error ? error : new Error(String(error)),
      'API'
    );

    return NextResponse.json(
      { 
        error: 'Failed to fetch specific analytics data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}