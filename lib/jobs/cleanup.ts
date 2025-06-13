import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { lt, and, eq, sql, inArray } from 'drizzle-orm';
import { kbUsageAnalytics, jiraTicketSync } from '../db/kb-schema';
import { message, chat, vote, stream } from '../db/schema';
import { cache } from '../cache/manager';
import { closeRedisConnection } from '../cache/redis';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface CleanupJobData {
  type: 'analytics' | 'cache' | 'logs' | 'temp_data' | 'all';
  olderThanDays?: number;
}

export class CleanupJob {
  static async process(data: CleanupJobData): Promise<void> {
    console.log('Processing cleanup job:', data);

    try {
      switch (data.type) {
        case 'analytics':
          await this.cleanupAnalytics(data.olderThanDays || 90);
          break;
        case 'cache':
          await this.cleanupCache();
          break;
        case 'logs':
          await this.cleanupLogs(data.olderThanDays || 30);
          break;
        case 'temp_data':
          await this.cleanupTempData(data.olderThanDays || 7);
          break;
        case 'all':
          await this.cleanupAll();
          break;
      }

      console.log('Cleanup job completed successfully');
    } catch (error) {
      console.error('Cleanup job failed:', error);
      throw error;
    }
  }

  private static async cleanupAnalytics(olderThanDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    console.log(`Cleaning up analytics data older than ${olderThanDays} days (before ${cutoffDate.toISOString()})`);

    try {
      // Clean up old usage analytics
      const deletedAnalytics = await db
        .delete(kbUsageAnalytics)
        .where(lt(kbUsageAnalytics.createdAt, cutoffDate))
        .returning({ id: kbUsageAnalytics.id });

      console.log(`Deleted ${deletedAnalytics.length} old analytics records`);

      // Clean up old sync metadata (keep last 30 days regardless of olderThanDays)
      const syncCutoffDate = new Date();
      syncCutoffDate.setDate(syncCutoffDate.getDate() - 30);

      const deletedSyncRecords = await db
        .delete(jiraTicketSync)
        .where(
          and(
            lt(jiraTicketSync.createdAt, syncCutoffDate),
            eq(jiraTicketSync.syncStatus, 'success')
          )
        )
        .returning({ id: jiraTicketSync.id });

      console.log(`Deleted ${deletedSyncRecords.length} old sync records`);
    } catch (error) {
      console.error('Failed to cleanup analytics:', error);
      throw error;
    }
  }

  private static async cleanupCache(): Promise<void> {
    console.log('Cleaning up cache...');

    try {
      // Clear expired cache entries (this is handled automatically by Redis TTL)
      // But we can force cleanup of specific patterns if needed
      
      // Clear old analytics cache
      await cache.delPattern('analytics_daily:*');
      
      // Clear old search cache (keep recent ones)
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      // Note: This is a simplified cleanup. In production, you'd want more sophisticated cache management
      
      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
      throw error;
    }
  }

  private static async cleanupLogs(olderThanDays: number): Promise<void> {
    console.log(`Cleaning up logs older than ${olderThanDays} days`);

    // This would typically clean up application logs stored in the database
    // For now, we'll clean up old chat messages and related data
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      // Clean up old votes first (foreign key constraint)
      const oldChats = await db
        .select({ id: chat.id })
        .from(chat)
        .where(lt(chat.createdAt, cutoffDate));

      if (oldChats.length > 0) {
        const chatIds = oldChats.map(c => c.id);
        
        // Delete votes for old chats
        await db
          .delete(vote)
          .where(inArray(vote.chatId, chatIds));

        // Delete messages for old chats
        await db
          .delete(message)
          .where(inArray(message.chatId, chatIds));

        // Delete streams for old chats
        await db
          .delete(stream)
          .where(inArray(stream.chatId, chatIds));

        // Finally delete the chats
        await db
          .delete(chat)
          .where(inArray(chat.id, chatIds));

        console.log(`Cleaned up ${oldChats.length} old chats and related data`);
      }
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
      throw error;
    }
  }

  private static async cleanupTempData(olderThanDays: number): Promise<void> {
    console.log(`Cleaning up temporary data older than ${olderThanDays} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      // Clean up failed sync records
      const deletedFailedSyncs = await db
        .delete(jiraTicketSync)
        .where(
          and(
            lt(jiraTicketSync.createdAt, cutoffDate),
            eq(jiraTicketSync.syncStatus, 'failed')
          )
        )
        .returning({ id: jiraTicketSync.id });

      console.log(`Deleted ${deletedFailedSyncs.length} failed sync records`);

      // Clean up orphaned analytics records (where article no longer exists)
      // This would require a more complex query with LEFT JOIN
      
      console.log('Temporary data cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup temporary data:', error);
      throw error;
    }
  }

  private static async cleanupAll(): Promise<void> {
    console.log('Running comprehensive cleanup...');

    try {
      await this.cleanupAnalytics(90); // 90 days for analytics
      await this.cleanupCache();
      await this.cleanupLogs(30); // 30 days for logs
      await this.cleanupTempData(7); // 7 days for temp data

      console.log('Comprehensive cleanup completed');
    } catch (error) {
      console.error('Failed to run comprehensive cleanup:', error);
      throw error;
    }
  }

  static async scheduleCleanup(data: CleanupJobData): Promise<string> {
    const { jobQueue } = await import('./queue');
    return jobQueue.addJob('cleanup', data, {
      priority: 0, // Low priority
      maxAttempts: 2
    });
  }

  static async schedulePeriodicCleanup(): Promise<void> {
    const { jobQueue } = await import('./queue');
    
    // Schedule daily cache cleanup at 2 AM
    await jobQueue.addJob('cleanup', { type: 'cache' }, {
      priority: 0,
      delay: this.getDelayUntilNextRun(2, 0), // 2 AM
      maxAttempts: 2
    });

    // Schedule weekly analytics cleanup on Sundays at 3 AM
    await jobQueue.addJob('cleanup', { type: 'analytics', olderThanDays: 90 }, {
      priority: 0,
      delay: this.getDelayUntilNextWeekday(0, 3, 0), // Sunday 3 AM
      maxAttempts: 2
    });

    // Schedule monthly comprehensive cleanup on the 1st at 4 AM
    await jobQueue.addJob('cleanup', { type: 'all' }, {
      priority: 0,
      delay: this.getDelayUntilNextMonth(4, 0), // 4 AM on 1st
      maxAttempts: 2
    });
  }

  private static getDelayUntilNextRun(hour: number, minute: number): number {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hour, minute, 0, 0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun.getTime() - now.getTime();
  }

  private static getDelayUntilNextWeekday(weekday: number, hour: number, minute: number): number {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hour, minute, 0, 0);
    
    const daysUntilWeekday = (weekday - now.getDay() + 7) % 7;
    if (daysUntilWeekday === 0 && nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    } else {
      nextRun.setDate(nextRun.getDate() + daysUntilWeekday);
    }
    
    return nextRun.getTime() - now.getTime();
  }

  private static getDelayUntilNextMonth(hour: number, minute: number): number {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setDate(1);
    nextRun.setHours(hour, minute, 0, 0);
    
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
    
    return nextRun.getTime() - now.getTime();
  }

  static async emergencyCleanup(): Promise<void> {
    console.log('Running emergency cleanup...');
    
    try {
      // Clean up cache
      await this.cleanupCache();
      
      // Clean up very old data (6 months)
      await this.cleanupAnalytics(180);
      await this.cleanupLogs(60);
      await this.cleanupTempData(1);
      
      console.log('Emergency cleanup completed');
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      throw error;
    }
  }
}