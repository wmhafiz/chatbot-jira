import { getRedisClient } from '../cache/redis';

export interface Job {
  id: string;
  type: string;
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export class JobQueue {
  private static instance: JobQueue;
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  async addJob(
    type: string,
    data: any,
    options: {
      priority?: number;
      delay?: number;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const job: Job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay,
      createdAt: new Date(),
    };

    const redis = await getRedisClient();
    if (redis) {
      const queueKey = `job_queue:${type}`;
      const score = options.delay 
        ? Date.now() + options.delay 
        : Date.now() - job.priority * 1000; // Higher priority = lower score
      
      await redis.zAdd(queueKey, { score, value: JSON.stringify(job) });
    } else {
      // Fallback to immediate processing if Redis is not available
      console.warn('Redis not available, processing job immediately');
      await this.processJob(job);
    }

    return job.id;
  }

  async getNextJob(type: string): Promise<Job | null> {
    const redis = await getRedisClient();
    if (!redis) return null;

    const queueKey = `job_queue:${type}`;
    const now = Date.now();
    
    // Get jobs that are ready to be processed (score <= now)
    const jobs = await redis.zRangeByScore(queueKey, 0, now, { LIMIT: { offset: 0, count: 1 } });
    
    if (jobs.length === 0) return null;

    const jobData = jobs[0];
    const job: Job = JSON.parse(jobData);
    
    // Remove from queue
    await redis.zRem(queueKey, jobData);
    
    return job;
  }

  async processJob(job: Job): Promise<void> {
    job.attempts++;
    job.processedAt = new Date();

    try {
      console.log(`Processing job ${job.id} of type ${job.type}`);
      
      switch (job.type) {
        case 'jira_sync':
          await this.processJiraSync(job);
          break;
        case 'kb_analytics':
          await this.processKBAnalytics(job);
          break;
        case 'embedding_generation':
          await this.processEmbeddingGeneration(job);
          break;
        case 'cleanup':
          await this.processCleanup(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.completedAt = new Date();
      console.log(`Job ${job.id} completed successfully`);
      
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      job.failedAt = new Date();
      
      console.error(`Job ${job.id} failed:`, error);
      
      // Retry if attempts < maxAttempts
      if (job.attempts < job.maxAttempts) {
        const delay = Math.pow(2, job.attempts) * 1000; // Exponential backoff
        await this.addJob(job.type, job.data, { 
          priority: job.priority, 
          delay,
          maxAttempts: job.maxAttempts 
        });
        console.log(`Job ${job.id} scheduled for retry in ${delay}ms`);
      } else {
        console.error(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
      }
    }
  }

  private async processJiraSync(job: Job): Promise<void> {
    const { JiraSyncJob } = await import('./jira-sync');
    await JiraSyncJob.process(job.data);
  }

  private async processKBAnalytics(job: Job): Promise<void> {
    const { KBAnalyticsJob } = await import('./kb-analytics');
    await KBAnalyticsJob.process(job.data);
  }

  private async processEmbeddingGeneration(job: Job): Promise<void> {
    const { EmbeddingGenerationJob } = await import('./embedding-generation');
    await EmbeddingGenerationJob.process(job.data);
  }

  private async processCleanup(job: Job): Promise<void> {
    const { CleanupJob } = await import('./cleanup');
    await CleanupJob.process(job.data);
  }

  async startProcessing(types: string[] = ['jira_sync', 'kb_analytics', 'embedding_generation', 'cleanup']): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    console.log('Starting job queue processing...');

    this.processingInterval = setInterval(async () => {
      for (const type of types) {
        try {
          const job = await this.getNextJob(type);
          if (job) {
            await this.processJob(job);
          }
        } catch (error) {
          console.error(`Error processing ${type} jobs:`, error);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  async stopProcessing(): Promise<void> {
    this.processing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('Job queue processing stopped');
  }

  async getQueueStats(type: string): Promise<{
    waiting: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const redis = await getRedisClient();
    if (!redis) {
      return { waiting: 0, processing: 0, completed: 0, failed: 0 };
    }

    const queueKey = `job_queue:${type}`;
    const waiting = await redis.zCard(queueKey);
    
    // For now, we'll just return waiting count
    // In a production system, you'd track processing, completed, and failed jobs
    return {
      waiting,
      processing: 0,
      completed: 0,
      failed: 0
    };
  }
}

export const jobQueue = JobQueue.getInstance();