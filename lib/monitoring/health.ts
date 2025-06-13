import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getRedisClient } from '../cache/redis';
import { JiraClient } from '../integrations/jira';
import { logger } from './logger';
import { cache } from '../cache/manager';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  uptime: number;
  version: string;
  timestamp: Date;
}

export class HealthMonitor {
  private static instance: HealthMonitor;

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple query to test database connectivity
      await db.execute('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        message: 'Database connection successful',
        timestamp: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      };
    }
  }

  async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const redis = await getRedisClient();
      
      if (!redis) {
        return {
          name: 'redis',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          message: 'Redis not configured - using memory cache fallback',
          timestamp: new Date()
        };
      }

      await redis.ping();
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'redis',
        status: responseTime < 50 ? 'healthy' : responseTime < 200 ? 'degraded' : 'unhealthy',
        responseTime,
        message: 'Redis connection successful',
        timestamp: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime,
        message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      };
    }
  }

  async checkJira(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
        return {
          name: 'jira',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          message: 'Jira not configured',
          details: { configured: false },
          timestamp: new Date()
        };
      }

      const jiraClient = new JiraClient();
      
      // Test with a simple API call
      const response = await fetch(`${process.env.JIRA_BASE_URL}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          name: 'jira',
          status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
          responseTime,
          message: 'Jira API connection successful',
          timestamp: new Date()
        };
      } else {
        return {
          name: 'jira',
          status: 'unhealthy',
          responseTime,
          message: `Jira API returned ${response.status}: ${response.statusText}`,
          details: { status: response.status, statusText: response.statusText },
          timestamp: new Date()
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'jira',
        status: 'unhealthy',
        responseTime,
        message: `Jira connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      };
    }
  }

  async checkOpenAI(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      if (!process.env.OPENAI_API_KEY) {
        return {
          name: 'openai',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          message: 'OpenAI API key not configured',
          details: { configured: false },
          timestamp: new Date()
        };
      }

      // Test with a simple API call
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          name: 'openai',
          status: responseTime < 2000 ? 'healthy' : responseTime < 5000 ? 'degraded' : 'unhealthy',
          responseTime,
          message: 'OpenAI API connection successful',
          timestamp: new Date()
        };
      } else {
        return {
          name: 'openai',
          status: 'unhealthy',
          responseTime,
          message: `OpenAI API returned ${response.status}: ${response.statusText}`,
          details: { status: response.status, statusText: response.statusText },
          timestamp: new Date()
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'openai',
        status: 'unhealthy',
        responseTime,
        message: `OpenAI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      };
    }
  }

  async checkMemory(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal + memUsage.external;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      let message: string;
      
      if (memoryUsagePercent < 70) {
        status = 'healthy';
        message = 'Memory usage is normal';
      } else if (memoryUsagePercent < 85) {
        status = 'degraded';
        message = 'Memory usage is elevated';
      } else {
        status = 'unhealthy';
        message = 'Memory usage is critical';
      }
      
      return {
        name: 'memory',
        status,
        responseTime,
        message,
        details: {
          usagePercent: Math.round(memoryUsagePercent * 100) / 100,
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
          external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
          rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100 // MB
        },
        timestamp: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'memory',
        status: 'unhealthy',
        responseTime,
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      };
    }
  }

  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    try {
      // Run all health checks in parallel
      const [database, redis, jira, openai, memory] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkJira(),
        this.checkOpenAI(),
        this.checkMemory()
      ]);

      const checks = [database, redis, jira, openai, memory];
      
      // Determine overall health
      const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
      const degradedCount = checks.filter(c => c.status === 'degraded').length;
      
      let overall: 'healthy' | 'degraded' | 'unhealthy';
      if (unhealthyCount > 0) {
        overall = 'unhealthy';
      } else if (degradedCount > 0) {
        overall = 'degraded';
      } else {
        overall = 'healthy';
      }

      const health: SystemHealth = {
        overall,
        checks,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date()
      };

      // Log health check results
      const totalTime = Date.now() - startTime;
      await logger.info(
        `Health check completed: ${overall} (${totalTime}ms)`,
        'HEALTH_CHECK',
        {
          overall,
          unhealthyCount,
          degradedCount,
          totalTime,
          checks: checks.map(c => ({ name: c.name, status: c.status, responseTime: c.responseTime }))
        }
      );

      // Cache the health check result
      await cache.set('system_health', health, 60); // Cache for 1 minute

      return health;
    } catch (error) {
      await logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)), 'HEALTH_CHECK');
      
      return {
        overall: 'unhealthy',
        checks: [],
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date()
      };
    }
  }

  async getCachedHealth(): Promise<SystemHealth | null> {
    return cache.get<SystemHealth>('system_health');
  }

  async schedulePeriodicHealthChecks(): Promise<void> {
    // Run health checks every 5 minutes
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        await logger.error('Periodic health check failed', error instanceof Error ? error : new Error(String(error)), 'HEALTH_CHECK');
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Initial health check
    await this.performHealthCheck();
  }

  async getHealthSummary(hours = 24): Promise<{
    currentHealth: SystemHealth;
    availability: number;
    averageResponseTime: number;
    incidents: Array<{
      service: string;
      status: string;
      timestamp: Date;
      duration?: number;
    }>;
  }> {
    const currentHealth = await this.performHealthCheck();
    
    // In a production system, you'd store health check history
    // For now, we'll return basic information
    return {
      currentHealth,
      availability: currentHealth.overall === 'healthy' ? 99.9 : currentHealth.overall === 'degraded' ? 95.0 : 85.0,
      averageResponseTime: currentHealth.checks.reduce((sum, check) => sum + check.responseTime, 0) / currentHealth.checks.length,
      incidents: currentHealth.checks
        .filter(check => check.status !== 'healthy')
        .map(check => ({
          service: check.name,
          status: check.status,
          timestamp: check.timestamp
        }))
    };
  }
}

export const healthMonitor = HealthMonitor.getInstance();