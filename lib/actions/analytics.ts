'use server';

import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user } from '@/lib/db/schema';
import { knowledgeBaseArticle, kbUsageAnalytics } from '@/lib/db/kb-schema';
import { ChatSDKError } from '@/lib/errors';

// Database connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Zod schemas for input validation
const trackUsageSchema = z.object({
  articleId: z.string().uuid('Invalid article ID'),
  action: z.enum(['view', 'search', 'helpful', 'not_helpful', 'share']),
  metadata: z.record(z.any()).optional(),
  sessionId: z.string().optional(),
});

const getAnalyticsSchema = z.object({
  articleId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  action: z.enum(['view', 'search', 'helpful', 'not_helpful', 'share']).optional(),
  limit: z.number().min(1).max(1000).default(100),
});

// Response type for consistent error handling
type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function trackKbUsage(data: z.infer<typeof trackUsageSchema>): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    // Allow anonymous tracking for some actions
    const userId = session?.user?.id || null;

    const validatedData = trackUsageSchema.parse(data);
    
    // Verify article exists
    const article = await db
      .select({ id: knowledgeBaseArticle.id })
      .from(knowledgeBaseArticle)
      .where(eq(knowledgeBaseArticle.id, validatedData.articleId))
      .limit(1);

    if (article.length === 0) {
      return { success: false, error: 'Article not found' };
    }

    const [usageRecord] = await db
      .insert(kbUsageAnalytics)
      .values({
        articleId: validatedData.articleId,
        userId,
        action: validatedData.action,
        metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
        sessionId: validatedData.sessionId,
        createdAt: new Date(),
      })
      .returning();

    return { success: true, data: usageRecord };
  } catch (error) {
    console.error('Error tracking KB usage:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    return { success: false, error: 'Failed to track usage' };
  }
}

export async function getKbAnalytics(params: Partial<z.infer<typeof getAnalyticsSchema>> = {}): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedParams = getAnalyticsSchema.parse(params);
    
    // Build base query conditions
    const conditions = [];
    
    if (validatedParams.articleId) {
      conditions.push(eq(kbUsageAnalytics.articleId, validatedParams.articleId));
    }
    
    if (validatedParams.action) {
      conditions.push(eq(kbUsageAnalytics.action, validatedParams.action));
    }
    
    if (validatedParams.startDate) {
      conditions.push(gte(kbUsageAnalytics.createdAt, validatedParams.startDate));
    }
    
    if (validatedParams.endDate) {
      conditions.push(lte(kbUsageAnalytics.createdAt, validatedParams.endDate));
    }

    // Get detailed usage records
    const usageRecords = await db
      .select({
        id: kbUsageAnalytics.id,
        articleId: kbUsageAnalytics.articleId,
        articleTitle: knowledgeBaseArticle.title,
        userId: kbUsageAnalytics.userId,
        action: kbUsageAnalytics.action,
        metadata: kbUsageAnalytics.metadata,
        sessionId: kbUsageAnalytics.sessionId,
        createdAt: kbUsageAnalytics.createdAt,
      })
      .from(kbUsageAnalytics)
      .leftJoin(
        knowledgeBaseArticle,
        eq(kbUsageAnalytics.articleId, knowledgeBaseArticle.id)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(kbUsageAnalytics.createdAt))
      .limit(validatedParams.limit);

    // Get summary statistics
    const totalViews = await db
      .select({ count: sql<number>`count(*)` })
      .from(kbUsageAnalytics)
      .where(
        and(
          eq(kbUsageAnalytics.action, 'view'),
          ...(conditions.length > 0 ? conditions : [])
        )
      );

    const totalSearches = await db
      .select({ count: sql<number>`count(*)` })
      .from(kbUsageAnalytics)
      .where(
        and(
          eq(kbUsageAnalytics.action, 'search'),
          ...(conditions.length > 0 ? conditions : [])
        )
      );

    const helpfulVotes = await db
      .select({ count: sql<number>`count(*)` })
      .from(kbUsageAnalytics)
      .where(
        and(
          eq(kbUsageAnalytics.action, 'helpful'),
          ...(conditions.length > 0 ? conditions : [])
        )
      );

    const notHelpfulVotes = await db
      .select({ count: sql<number>`count(*)` })
      .from(kbUsageAnalytics)
      .where(
        and(
          eq(kbUsageAnalytics.action, 'not_helpful'),
          ...(conditions.length > 0 ? conditions : [])
        )
      );

    // Get top articles by views
    const topArticles = await db
      .select({
        articleId: kbUsageAnalytics.articleId,
        articleTitle: knowledgeBaseArticle.title,
        viewCount: sql<number>`count(*)`,
      })
      .from(kbUsageAnalytics)
      .leftJoin(
        knowledgeBaseArticle,
        eq(kbUsageAnalytics.articleId, knowledgeBaseArticle.id)
      )
      .where(
        and(
          eq(kbUsageAnalytics.action, 'view'),
          ...(conditions.length > 0 ? conditions : [])
        )
      )
      .groupBy(kbUsageAnalytics.articleId, knowledgeBaseArticle.title)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Get usage trends (daily counts for the last 30 days if no date range specified)
    const trendsStartDate = validatedParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendsEndDate = validatedParams.endDate || new Date();

    const usageTrends = await db
      .select({
        date: sql<string>`DATE(${kbUsageAnalytics.createdAt})`,
        action: kbUsageAnalytics.action,
        count: sql<number>`count(*)`,
      })
      .from(kbUsageAnalytics)
      .where(
        and(
          gte(kbUsageAnalytics.createdAt, trendsStartDate),
          lte(kbUsageAnalytics.createdAt, trendsEndDate),
          ...(validatedParams.articleId ? [eq(kbUsageAnalytics.articleId, validatedParams.articleId)] : [])
        )
      )
      .groupBy(sql`DATE(${kbUsageAnalytics.createdAt})`, kbUsageAnalytics.action)
      .orderBy(sql`DATE(${kbUsageAnalytics.createdAt})`);

    const analytics = {
      summary: {
        totalViews: totalViews[0]?.count || 0,
        totalSearches: totalSearches[0]?.count || 0,
        helpfulVotes: helpfulVotes[0]?.count || 0,
        notHelpfulVotes: notHelpfulVotes[0]?.count || 0,
        helpfulnessRatio: 
          (helpfulVotes[0]?.count || 0) + (notHelpfulVotes[0]?.count || 0) > 0
            ? (helpfulVotes[0]?.count || 0) / ((helpfulVotes[0]?.count || 0) + (notHelpfulVotes[0]?.count || 0))
            : 0,
      },
      topArticles,
      usageTrends,
      recentActivity: usageRecords,
    };

    return { success: true, data: analytics };
  } catch (error) {
    console.error('Error getting KB analytics:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    return { success: false, error: 'Failed to get analytics' };
  }
}

export async function getArticleAnalytics(articleId: string): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!z.string().uuid().safeParse(articleId).success) {
      return { success: false, error: 'Invalid article ID' };
    }

    // Verify article exists
    const article = await db
      .select({
        id: knowledgeBaseArticle.id,
        title: knowledgeBaseArticle.title,
        createdAt: knowledgeBaseArticle.createdAt,
      })
      .from(knowledgeBaseArticle)
      .where(eq(knowledgeBaseArticle.id, articleId))
      .limit(1);

    if (article.length === 0) {
      return { success: false, error: 'Article not found' };
    }

    // Get analytics for this specific article
    const analytics = await getKbAnalytics({ articleId });
    
    if (!analytics.success) {
      return analytics;
    }

    return {
      success: true,
      data: {
        article: article[0],
        analytics: analytics.data,
      },
    };
  } catch (error) {
    console.error('Error getting article analytics:', error);
    return { success: false, error: 'Failed to get article analytics' };
  }
}