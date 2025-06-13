import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, gte, lte, and, sql, count } from 'drizzle-orm';
import { knowledgeBaseArticle, kbUsageAnalytics } from '../db/kb-schema';
import { cache } from '../cache/manager';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface KBAnalyticsJobData {
  type: 'daily' | 'weekly' | 'monthly';
  date?: string; // ISO date string
}

export class KBAnalyticsJob {
  static async process(data: KBAnalyticsJobData): Promise<void> {
    console.log('Processing KB analytics job:', data);

    try {
      switch (data.type) {
        case 'daily':
          await this.processDailyAnalytics(data.date);
          break;
        case 'weekly':
          await this.processWeeklyAnalytics(data.date);
          break;
        case 'monthly':
          await this.processMonthlyAnalytics(data.date);
          break;
      }

      // Invalidate analytics cache
      await cache.delPattern('analytics_*');
      
      console.log('KB analytics job completed successfully');
    } catch (error) {
      console.error('KB analytics job failed:', error);
      throw error;
    }
  }

  private static async processDailyAnalytics(dateStr?: string): Promise<void> {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Processing daily analytics for ${startOfDay.toISOString()}`);

    // Get daily view counts by article
    const dailyViews = await db
      .select({
        articleId: kbUsageAnalytics.articleId,
        viewCount: count(),
        uniqueUsers: sql<number>`count(distinct ${kbUsageAnalytics.userId})`
      })
      .from(kbUsageAnalytics)
      .where(
        and(
          eq(kbUsageAnalytics.action, 'view'),
          gte(kbUsageAnalytics.createdAt, startOfDay),
          lte(kbUsageAnalytics.createdAt, endOfDay)
        )
      )
      .groupBy(kbUsageAnalytics.articleId);

    // Get daily search counts
    const dailySearches = await db
      .select({
        searchCount: count(),
        uniqueUsers: sql<number>`count(distinct ${kbUsageAnalytics.userId})`
      })
      .from(kbUsageAnalytics)
      .where(
        and(
          eq(kbUsageAnalytics.action, 'search'),
          gte(kbUsageAnalytics.createdAt, startOfDay),
          lte(kbUsageAnalytics.createdAt, endOfDay)
        )
      );

    // Store aggregated data (in a production system, you'd have a separate analytics table)
    const analyticsData = {
      date: startOfDay.toISOString().split('T')[0],
      type: 'daily',
      totalViews: dailyViews.reduce((sum, item) => sum + item.viewCount, 0),
      totalSearches: dailySearches[0]?.searchCount || 0,
      uniqueViewers: dailyViews.reduce((sum, item) => sum + item.uniqueUsers, 0),
      uniqueSearchers: dailySearches[0]?.uniqueUsers || 0,
      topArticles: dailyViews.slice(0, 10)
    };

    // Cache the analytics data
    await cache.set(
      `analytics_daily:${analyticsData.date}`,
      analyticsData,
      24 * 60 * 60 // 24 hours
    );

    console.log(`Daily analytics processed: ${analyticsData.totalViews} views, ${analyticsData.totalSearches} searches`);
  }

  private static async processWeeklyAnalytics(dateStr?: string): Promise<void> {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log(`Processing weekly analytics for week starting ${startOfWeek.toISOString()}`);

    // Get weekly view trends
    const weeklyViews = await db
      .select({
        articleId: kbUsageAnalytics.articleId,
        viewCount: count(),
        uniqueUsers: sql<number>`count(distinct ${kbUsageAnalytics.userId})`
      })
      .from(kbUsageAnalytics)
      .where(
        and(
          eq(kbUsageAnalytics.action, 'view'),
          gte(kbUsageAnalytics.createdAt, startOfWeek),
          lte(kbUsageAnalytics.createdAt, endOfWeek)
        )
      )
      .groupBy(kbUsageAnalytics.articleId);

    // Get category performance
    const categoryPerformance = await db
      .select({
        categoryId: knowledgeBaseArticle.categoryId,
        viewCount: count(),
        articleCount: sql<number>`count(distinct ${knowledgeBaseArticle.id})`
      })
      .from(kbUsageAnalytics)
      .innerJoin(knowledgeBaseArticle, eq(kbUsageAnalytics.articleId, knowledgeBaseArticle.id))
      .where(
        and(
          eq(kbUsageAnalytics.action, 'view'),
          gte(kbUsageAnalytics.createdAt, startOfWeek),
          lte(kbUsageAnalytics.createdAt, endOfWeek)
        )
      )
      .groupBy(knowledgeBaseArticle.categoryId);

    const analyticsData = {
      weekStart: startOfWeek.toISOString().split('T')[0],
      weekEnd: endOfWeek.toISOString().split('T')[0],
      type: 'weekly',
      totalViews: weeklyViews.reduce((sum, item) => sum + item.viewCount, 0),
      uniqueViewers: weeklyViews.reduce((sum, item) => sum + item.uniqueUsers, 0),
      topArticles: weeklyViews.slice(0, 20),
      categoryPerformance
    };

    await cache.set(
      `analytics_weekly:${analyticsData.weekStart}`,
      analyticsData,
      7 * 24 * 60 * 60 // 7 days
    );

    console.log(`Weekly analytics processed: ${analyticsData.totalViews} views across ${categoryPerformance.length} categories`);
  }

  private static async processMonthlyAnalytics(dateStr?: string): Promise<void> {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log(`Processing monthly analytics for ${startOfMonth.toISOString()}`);

    // Get monthly trends and growth metrics
    const monthlyViews = await db
      .select({
        totalViews: count(),
        uniqueUsers: sql<number>`count(distinct ${kbUsageAnalytics.userId})`
      })
      .from(kbUsageAnalytics)
      .where(
        and(
          eq(kbUsageAnalytics.action, 'view'),
          gte(kbUsageAnalytics.createdAt, startOfMonth),
          lte(kbUsageAnalytics.createdAt, endOfMonth)
        )
      );

    // Get top performing articles for the month
    const topArticles = await db
      .select({
        articleId: kbUsageAnalytics.articleId,
        title: knowledgeBaseArticle.title,
        viewCount: count(),
        uniqueUsers: sql<number>`count(distinct ${kbUsageAnalytics.userId})`
      })
      .from(kbUsageAnalytics)
      .innerJoin(knowledgeBaseArticle, eq(kbUsageAnalytics.articleId, knowledgeBaseArticle.id))
      .where(
        and(
          eq(kbUsageAnalytics.action, 'view'),
          gte(kbUsageAnalytics.createdAt, startOfMonth),
          lte(kbUsageAnalytics.createdAt, endOfMonth)
        )
      )
      .groupBy(kbUsageAnalytics.articleId, knowledgeBaseArticle.title)
      .orderBy(sql`count(*) DESC`)
      .limit(50);

    const analyticsData = {
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      type: 'monthly',
      totalViews: monthlyViews[0]?.totalViews || 0,
      uniqueUsers: monthlyViews[0]?.uniqueUsers || 0,
      topArticles,
      generatedAt: new Date().toISOString()
    };

    await cache.set(
      `analytics_monthly:${analyticsData.month}`,
      analyticsData,
      30 * 24 * 60 * 60 // 30 days
    );

    console.log(`Monthly analytics processed: ${analyticsData.totalViews} views, ${analyticsData.uniqueUsers} unique users`);
  }

  static async scheduleAnalytics(type: 'daily' | 'weekly' | 'monthly', date?: string): Promise<string> {
    const { jobQueue } = await import('./queue');
    return jobQueue.addJob('kb_analytics', { type, date }, {
      priority: 2,
      maxAttempts: 2
    });
  }

  static async schedulePeriodicAnalytics(): Promise<void> {
    const { jobQueue } = await import('./queue');
    
    // Schedule daily analytics to run every day at 1 AM
    await jobQueue.addJob('kb_analytics', { type: 'daily' }, {
      priority: 2,
      delay: this.getDelayUntilNextRun(1, 0), // 1 AM
      maxAttempts: 2
    });

    // Schedule weekly analytics to run every Monday at 2 AM
    await jobQueue.addJob('kb_analytics', { type: 'weekly' }, {
      priority: 1,
      delay: this.getDelayUntilNextWeekday(1, 2, 0), // Monday 2 AM
      maxAttempts: 2
    });

    // Schedule monthly analytics to run on the 1st of each month at 3 AM
    await jobQueue.addJob('kb_analytics', { type: 'monthly' }, {
      priority: 1,
      delay: this.getDelayUntilNextMonth(3, 0), // 3 AM on 1st
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
}