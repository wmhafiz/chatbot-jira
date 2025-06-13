import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor } from '@/lib/monitoring/health';
import { performanceMonitor } from '@/lib/monitoring/performance';
import { logger } from '@/lib/monitoring/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if this is a detailed health check or simple ping
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';
    const format = url.searchParams.get('format') || 'json';

    if (!detailed) {
      // Simple ping response for load balancers
      return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }, { status: 200 });
    }

    // Detailed health check
    const health = await healthMonitor.performHealthCheck();
    const responseTime = Date.now() - startTime;

    // Log the health check request
    await logger.logRequest(
      'GET',
      '/api/health',
      undefined,
      undefined,
      request.headers.get('x-request-id') || undefined
    );

    // Record performance metric
    performanceMonitor.recordMetric({
      name: 'health_check',
      value: responseTime,
      unit: 'ms',
      timestamp: new Date(),
      context: 'API'
    });

    // Determine HTTP status based on health
    let status = 200;
    if (health.overall === 'degraded') {
      status = 200; // Still operational
    } else if (health.overall === 'unhealthy') {
      status = 503; // Service unavailable
    }

    if (format === 'prometheus') {
      // Return Prometheus metrics format
      const metrics = health.checks.map(check => {
        const labels = `service="${check.name}"`;
        return [
          `health_check_status{${labels}} ${check.status === 'healthy' ? 1 : check.status === 'degraded' ? 0.5 : 0}`,
          `health_check_response_time_ms{${labels}} ${check.responseTime}`
        ].join('\n');
      }).join('\n');

      return new Response(metrics, {
        status,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
        }
      });
    }

    // Return JSON format
    return NextResponse.json(health, { status });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    await logger.error(
      'Health check endpoint failed',
      error instanceof Error ? error : new Error(String(error)),
      'API'
    );

    return NextResponse.json({
      overall: 'unhealthy',
      checks: [],
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date(),
      error: 'Health check failed'
    }, { status: 503 });
  }
}

// Simple ping endpoint
export async function HEAD(request: NextRequest) {
  return new Response(null, { status: 200 });
}