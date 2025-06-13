#!/usr/bin/env tsx

/**
 * Production Initialization Script
 * 
 * This script sets up the production environment, initializes background jobs,
 * and starts monitoring services.
 */

import { jobQueue } from '../lib/jobs/queue';
import { JiraSyncJob } from '../lib/jobs/jira-sync';
import { KBAnalyticsJob } from '../lib/jobs/kb-analytics';
import { EmbeddingGenerationJob } from '../lib/jobs/embedding-generation';
import { CleanupJob } from '../lib/jobs/cleanup';
import { healthMonitor } from '../lib/monitoring/health';
import { performanceMonitor } from '../lib/monitoring/performance';
import { logger } from '../lib/monitoring/logger';
import { cache } from '../lib/cache/manager';

async function initializeProduction() {
  console.log('🚀 Initializing Production Environment...');
  
  try {
    // 1. Verify environment configuration
    await verifyEnvironment();
    
    // 2. Initialize monitoring
    await initializeMonitoring();
    
    // 3. Start background job processing
    await initializeJobQueue();
    
    // 4. Schedule periodic jobs
    await schedulePeriodicJobs();
    
    // 5. Warm up caches
    await warmupCaches();
    
    // 6. Perform initial health check
    await performInitialHealthCheck();
    
    console.log('✅ Production environment initialized successfully!');
    
    // Keep the process running
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('❌ Failed to initialize production environment:', error);
    process.exit(1);
  }
}

async function verifyEnvironment(): Promise<void> {
  console.log('🔍 Verifying environment configuration...');
  
  const requiredEnvVars = [
    'POSTGRES_URL',
    'AUTH_SECRET',
    'OPENAI_API_KEY',
    'JIRA_BASE_URL',
    'JIRA_EMAIL',
    'JIRA_API_TOKEN'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Verify database connection
  try {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    
    const client = postgres(process.env.POSTGRES_URL!);
    const db = drizzle(client);
    
    await db.execute('SELECT 1');
    await client.end();
    
    console.log('✅ Database connection verified');
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`);
  }
  
  // Verify Redis connection (optional)
  try {
    const redis = await import('../lib/cache/redis');
    const client = await redis.getRedisClient();
    
    if (client) {
      await client.ping();
      console.log('✅ Redis connection verified');
    } else {
      console.log('⚠️  Redis not configured - using memory cache fallback');
    }
  } catch (error) {
    console.log('⚠️  Redis connection failed - using memory cache fallback');
  }
  
  console.log('✅ Environment verification completed');
}

async function initializeMonitoring(): Promise<void> {
  console.log('📊 Initializing monitoring services...');
  
  // Start periodic health checks
  await healthMonitor.schedulePeriodicHealthChecks();
  
  // Initialize performance monitoring
  performanceMonitor.setThresholds({
    vectorSearch: 500,
    dbQuery: 100,
    apiCall: 2000,
    pageLoad: 3000,
    memoryUsage: 80
  });
  
  // Log initialization
  await logger.info('Production environment initializing', 'STARTUP', {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid
  });
  
  console.log('✅ Monitoring services initialized');
}

async function initializeJobQueue(): Promise<void> {
  console.log('⚙️  Initializing background job processing...');
  
  // Start job queue processing
  await jobQueue.startProcessing([
    'jira_sync',
    'kb_analytics', 
    'embedding_generation',
    'cleanup'
  ]);
  
  console.log('✅ Background job processing started');
}

async function schedulePeriodicJobs(): Promise<void> {
  console.log('📅 Scheduling periodic jobs...');
  
  try {
    // Schedule Jira synchronization
    await JiraSyncJob.schedulePeriodicSync();
    console.log('✅ Jira sync jobs scheduled');
    
    // Schedule KB analytics
    await KBAnalyticsJob.schedulePeriodicAnalytics();
    console.log('✅ KB analytics jobs scheduled');
    
    // Schedule embedding generation
    await EmbeddingGenerationJob.schedulePeriodicEmbeddingGeneration();
    console.log('✅ Embedding generation jobs scheduled');
    
    // Schedule cleanup jobs
    await CleanupJob.schedulePeriodicCleanup();
    console.log('✅ Cleanup jobs scheduled');
    
  } catch (error) {
    console.error('⚠️  Failed to schedule some periodic jobs:', error);
    // Don't fail initialization for job scheduling issues
  }
  
  console.log('✅ Periodic jobs scheduling completed');
}

async function warmupCaches(): Promise<void> {
  console.log('🔥 Warming up caches...');
  
  try {
    // Pre-generate performance report
    await performanceMonitor.cachePerformanceReport();
    
    // Perform initial health check to cache results
    await healthMonitor.performHealthCheck();
    
    console.log('✅ Cache warmup completed');
  } catch (error) {
    console.error('⚠️  Cache warmup failed:', error);
    // Don't fail initialization for cache warmup issues
  }
}

async function performInitialHealthCheck(): Promise<void> {
  console.log('🏥 Performing initial health check...');
  
  const health = await healthMonitor.performHealthCheck();
  
  if (health.overall === 'unhealthy') {
    console.error('❌ System health check failed:', health);
    throw new Error('System is unhealthy - cannot start production');
  }
  
  if (health.overall === 'degraded') {
    console.warn('⚠️  System health is degraded:', health);
  }
  
  console.log(`✅ System health: ${health.overall.toUpperCase()}`);
  
  // Log health status
  await logger.info(`Production startup health check: ${health.overall}`, 'STARTUP', {
    healthChecks: health.checks.map(check => ({
      name: check.name,
      status: check.status,
      responseTime: check.responseTime
    }))
  });
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Stop job queue processing
    await jobQueue.stopProcessing();
    console.log('✅ Job queue stopped');
    
    // Close cache connections
    const redis = await import('../lib/cache/redis');
    await redis.closeRedisConnection();
    console.log('✅ Cache connections closed');
    
    // Log shutdown
    await logger.info('Production environment shutting down', 'SHUTDOWN', {
      signal,
      uptime: process.uptime()
    });
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Health check endpoint for process managers
async function healthCheck(): Promise<void> {
  try {
    const health = await healthMonitor.performHealthCheck();
    
    if (health.overall === 'unhealthy') {
      console.error('Health check failed:', health);
      process.exit(1);
    }
    
    console.log('Health check passed:', health.overall);
    process.exit(0);
    
  } catch (error) {
    console.error('Health check error:', error);
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'init':
    initializeProduction();
    break;
  case 'health':
    healthCheck();
    break;
  default:
    console.log('Usage: tsx scripts/init-production.ts [init|health]');
    console.log('  init   - Initialize production environment');
    console.log('  health - Perform health check');
    process.exit(1);
}