import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cache } from '../cache/manager';
import { knowledgeBaseArticle, knowledgeBaseCategory, jiraTicket, kbUsageAnalytics } from './kb-schema';
import { chat, message, user } from './schema';
import { eq, desc, and, or, ilike, sql, count, gte, lte } from 'drizzle-orm';
import type { KnowledgeBaseArticle, JiraTicket } from './kb-schema';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Optimized KB queries with caching
export class OptimizedKBQueries {
  static async getArticleById(id: string): Promise<KnowledgeBaseArticle | null> {
    return cache.cacheKBEntry(id, async () => {
      const result = await db
        .select()
        .from(knowledgeBaseArticle)
        .where(eq(knowledgeBaseArticle.id, id))
        .limit(1);
      
      return result[0] || null;
    });
  }

  static async getArticlesByCategory(
    categoryId: string,
    limit = 20,
    offset = 0
  ): Promise<KnowledgeBaseArticle[]> {
    const cacheKey = `kb_articles_category:${categoryId}:${limit}:${offset}`;
    
    return cache.getOrSet(cacheKey, async () => {
      return db
        .select()
        .from(knowledgeBaseArticle)
        .where(eq(knowledgeBaseArticle.categoryId, categoryId))
        .orderBy(desc(knowledgeBaseArticle.updatedAt))
        .limit(limit)
        .offset(offset);
    }, 600); // 10 minutes cache
  }

  static async searchArticles(
    query: string,
    categoryId?: string,
    tags?: string[],
    limit = 20
  ): Promise<KnowledgeBaseArticle[]> {
    const cacheKey = `kb_search:${Buffer.from(query).toString('base64')}:${categoryId || 'all'}:${tags?.join(',') || 'no_tags'}:${limit}`;
    
    return cache.getOrSet(cacheKey, async () => {
      let whereConditions = [
        or(
          sql`to_tsvector('english', ${knowledgeBaseArticle.title}) @@ plainto_tsquery('english', ${query})`,
          sql`to_tsvector('english', ${knowledgeBaseArticle.content}) @@ plainto_tsquery('english', ${query})`,
          ilike(knowledgeBaseArticle.title, `%${query}%`),
          ilike(knowledgeBaseArticle.content, `%${query}%`)
        )
      ];

      if (categoryId) {
        whereConditions.push(eq(knowledgeBaseArticle.categoryId, categoryId));
      }

      if (tags && tags.length > 0) {
        whereConditions.push(
          sql`${knowledgeBaseArticle.tags} && ${tags}`
        );
      }

      return db
        .select()
        .from(knowledgeBaseArticle)
        .where(and(...whereConditions))
        .orderBy(
          sql`ts_rank(to_tsvector('english', ${knowledgeBaseArticle.title} || ' ' || ${knowledgeBaseArticle.content}), plainto_tsquery('english', ${query})) DESC`,
          desc(knowledgeBaseArticle.updatedAt)
        )
        .limit(limit);
    }, 300); // 5 minutes cache
  }

  static async getPopularArticles(limit = 10): Promise<KnowledgeBaseArticle[]> {
    const cacheKey = `kb_popular:${limit}`;
    
    return cache.getOrSet(cacheKey, async () => {
      // Get popular articles based on usage analytics
      const popularArticleIds = await db
        .select({
          articleId: kbUsageAnalytics.articleId,
          viewCount: sql<number>`count(*)`
        })
        .from(kbUsageAnalytics)
        .where(eq(kbUsageAnalytics.action, 'view'))
        .groupBy(kbUsageAnalytics.articleId)
        .orderBy(sql`count(*) DESC`)
        .limit(limit);

      if (popularArticleIds.length === 0) {
        // Fallback to recent articles if no analytics data
        return db
          .select()
          .from(knowledgeBaseArticle)
          .orderBy(desc(knowledgeBaseArticle.updatedAt))
          .limit(limit);
      }

      const articleIds = popularArticleIds.map(p => p.articleId);
      return db
        .select()
        .from(knowledgeBaseArticle)
        .where(sql`${knowledgeBaseArticle.id} = ANY(${articleIds})`)
        .orderBy(desc(knowledgeBaseArticle.updatedAt));
    }, 1800); // 30 minutes cache
  }

  static async getRecentArticles(limit = 10): Promise<KnowledgeBaseArticle[]> {
    const cacheKey = `kb_recent:${limit}`;
    
    return cache.getOrSet(cacheKey, async () => {
      return db
        .select()
        .from(knowledgeBaseArticle)
        .orderBy(desc(knowledgeBaseArticle.createdAt))
        .limit(limit);
    }, 600); // 10 minutes cache
  }

  static async recordView(articleId: string, userId?: string, sessionId?: string): Promise<void> {
    // Record view in analytics table
    await db
      .insert(kbUsageAnalytics)
      .values({
        articleId,
        userId,
        action: 'view',
        sessionId,
        createdAt: new Date()
      });

    // Invalidate cache for this article
    await cache.del(`kb_entry:${articleId}`);
    await cache.del(`kb_popular:10`); // Invalidate popular articles cache
  }
}

// Optimized Jira queries with caching
export class OptimizedJiraQueries {
  static async getTicketByKey(key: string): Promise<JiraTicket | null> {
    return cache.cacheJiraTicket(key, async () => {
      const result = await db
        .select()
        .from(jiraTicket)
        .where(eq(jiraTicket.issueKey, key))
        .limit(1);
      
      return result[0] || null;
    });
  }

  static async searchTickets(
    query: string,
    projectKey?: string,
    status?: string,
    assignee?: string,
    limit = 20
  ): Promise<JiraTicket[]> {
    const cacheKey = `jira_search:${Buffer.from(query).toString('base64')}:${projectKey || 'all'}:${status || 'all'}:${assignee || 'all'}:${limit}`;
    
    return cache.getOrSet(cacheKey, async () => {
      let whereConditions = [
        or(
          sql`to_tsvector('english', ${jiraTicket.title}) @@ plainto_tsquery('english', ${query})`,
          sql`to_tsvector('english', ${jiraTicket.description}) @@ plainto_tsquery('english', ${query})`,
          ilike(jiraTicket.title, `%${query}%`),
          ilike(jiraTicket.issueKey, `%${query}%`)
        )
      ];

      if (status) {
        whereConditions.push(eq(jiraTicket.status, status));
      }

      if (assignee) {
        whereConditions.push(eq(jiraTicket.assignee, assignee));
      }

      return db
        .select()
        .from(jiraTicket)
        .where(and(...whereConditions))
        .orderBy(
          sql`ts_rank(to_tsvector('english', ${jiraTicket.title} || ' ' || ${jiraTicket.description}), plainto_tsquery('english', ${query})) DESC`,
          desc(jiraTicket.updatedAt)
        )
        .limit(limit);
    }, 180); // 3 minutes cache
  }

  static async getOpenTickets(limit = 50): Promise<JiraTicket[]> {
    const cacheKey = `jira_open:${limit}`;
    
    return cache.getOrSet(cacheKey, async () => {
      return db
        .select()
        .from(jiraTicket)
        .where(
          sql`${jiraTicket.status} NOT IN ('Done', 'Closed', 'Resolved')`
        )
        .orderBy(desc(jiraTicket.updatedAt))
        .limit(limit);
    }, 300); // 5 minutes cache
  }

  static async getTicketsByAssignee(assignee: string, limit = 20): Promise<JiraTicket[]> {
    const cacheKey = `jira_assignee:${assignee}:${limit}`;
    
    return cache.getOrSet(cacheKey, async () => {
      return db
        .select()
        .from(jiraTicket)
        .where(eq(jiraTicket.assignee, assignee))
        .orderBy(desc(jiraTicket.updatedAt))
        .limit(limit);
    }, 300); // 5 minutes cache
  }
}

// Analytics queries with caching
export class AnalyticsQueries {
  static async getKBUsageStats(days = 30): Promise<{
    totalViews: number;
    totalArticles: number;
    popularCategories: Array<{ categoryId: string; viewCount: number }>;
    recentSearches: number;
  }> {
    const cacheKey = `analytics_kb:${days}`;
    
    return cache.getOrSet(cacheKey, async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [totalViewsResult, totalArticlesResult] = await Promise.all([
        db
          .select({ total: sql<number>`count(*)` })
          .from(kbUsageAnalytics)
          .where(eq(kbUsageAnalytics.action, 'view')),
        db
          .select({ count: count() })
          .from(knowledgeBaseArticle)
      ]);

      const popularCategories = await db
        .select({
          categoryId: knowledgeBaseArticle.categoryId,
          viewCount: sql<number>`count(*)`
        })
        .from(kbUsageAnalytics)
        .innerJoin(knowledgeBaseArticle, eq(kbUsageAnalytics.articleId, knowledgeBaseArticle.id))
        .where(eq(kbUsageAnalytics.action, 'view'))
        .groupBy(knowledgeBaseArticle.categoryId)
        .orderBy(sql`count(*) DESC`)
        .limit(10);

      return {
        totalViews: totalViewsResult[0]?.total || 0,
        totalArticles: totalArticlesResult[0]?.count || 0,
        popularCategories,
        recentSearches: 0 // Would need search logging to implement
      };
    }, 1800); // 30 minutes cache
  }

  static async getChatUsageStats(days = 30): Promise<{
    totalChats: number;
    totalMessages: number;
    activeUsers: number;
    averageMessagesPerChat: number;
  }> {
    const cacheKey = `analytics_chat:${days}`;
    
    return cache.getOrSet(cacheKey, async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [totalChatsResult, totalMessagesResult, activeUsersResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(chat)
          .where(gte(chat.createdAt, since)),
        db
          .select({ count: count() })
          .from(message)
          .where(gte(message.createdAt, since)),
        db
          .select({ count: sql<number>`count(distinct ${chat.userId})` })
          .from(chat)
          .where(gte(chat.createdAt, since))
      ]);

      const totalChats = totalChatsResult[0]?.count || 0;
      const totalMessages = totalMessagesResult[0]?.count || 0;
      const activeUsers = activeUsersResult[0]?.count || 0;

      return {
        totalChats,
        totalMessages,
        activeUsers,
        averageMessagesPerChat: totalChats > 0 ? totalMessages / totalChats : 0
      };
    }, 1800); // 30 minutes cache
  }

  static async getJiraIntegrationStats(days = 30): Promise<{
    totalTickets: number;
    ticketsByStatus: Array<{ status: string; count: number }>;
    ticketsByPriority: Array<{ priority: string; count: number }>;
    recentActivity: number;
  }> {
    const cacheKey = `analytics_jira:${days}`;
    
    return cache.getOrSet(cacheKey, async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [totalTicketsResult, ticketsByStatus, ticketsByPriority, recentActivityResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(jiraTicket),
        db
          .select({
            status: jiraTicket.status,
            count: count()
          })
          .from(jiraTicket)
          .groupBy(jiraTicket.status)
          .orderBy(desc(count())),
        db
          .select({
            priority: jiraTicket.priority,
            count: count()
          })
          .from(jiraTicket)
          .groupBy(jiraTicket.priority)
          .orderBy(desc(count())),
        db
          .select({ count: count() })
          .from(jiraTicket)
          .where(gte(jiraTicket.updatedAt, since))
      ]);

      return {
        totalTickets: totalTicketsResult[0]?.count || 0,
        ticketsByStatus,
        ticketsByPriority,
        recentActivity: recentActivityResult[0]?.count || 0
      };
    }, 1800); // 30 minutes cache
  }
}