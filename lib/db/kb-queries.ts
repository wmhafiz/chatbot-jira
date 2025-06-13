import 'server-only';

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  sql,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  knowledgeBaseCategory,
  knowledgeBaseArticle,
  jiraTicket,
  kbJiraLink,
  jiraTicketSync,
  type KnowledgeBaseCategory,
  type KnowledgeBaseArticle,
  type JiraTicket,
  type KbJiraLink,
  type JiraTicketSync,
} from './kb-schema';
import { ChatSDKError } from '../errors';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Knowledge Base Category functions
export async function createKnowledgeBaseCategory({
  name,
  description,
}: {
  name: string;
  description?: string;
}) {
  try {
    return await db
      .insert(knowledgeBaseCategory)
      .values({
        name,
        description,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create knowledge base category',
    );
  }
}

export async function getKnowledgeBaseCategories() {
  try {
    return await db
      .select()
      .from(knowledgeBaseCategory)
      .orderBy(asc(knowledgeBaseCategory.name));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get knowledge base categories',
    );
  }
}

export async function getKnowledgeBaseCategoryById({ id }: { id: string }) {
  try {
    const [category] = await db
      .select()
      .from(knowledgeBaseCategory)
      .where(eq(knowledgeBaseCategory.id, id));
    return category;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get knowledge base category by id',
    );
  }
}

// Knowledge Base Article functions
export async function createKnowledgeBaseArticle({
  title,
  content,
  summary,
  tags,
  categoryId,
  userId,
  embedding,
}: {
  title: string;
  content: string;
  summary?: string;
  tags?: string;
  categoryId: string;
  userId: string;
  embedding?: number[];
}) {
  try {
    return await db
      .insert(knowledgeBaseArticle)
      .values({
        title,
        content,
        summary,
        tags,
        categoryId,
        userId,
        embedding: embedding ? sql`${embedding}::vector` : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create knowledge base article',
    );
  }
}

export async function updateKnowledgeBaseArticle({
  id,
  title,
  content,
  summary,
  tags,
  categoryId,
  embedding,
}: {
  id: string;
  title?: string;
  content?: string;
  summary?: string;
  tags?: string;
  categoryId?: string;
  embedding?: number[];
}) {
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (tags !== undefined) updateData.tags = tags;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (embedding !== undefined) {
      updateData.embedding = sql`${embedding}::vector`;
    }

    return await db
      .update(knowledgeBaseArticle)
      .set(updateData)
      .where(eq(knowledgeBaseArticle.id, id))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update knowledge base article',
    );
  }
}

export async function getKnowledgeBaseArticles({
  categoryId,
  limit = 50,
}: {
  categoryId?: string;
  limit?: number;
} = {}) {
  try {
    const query = db
      .select({
        id: knowledgeBaseArticle.id,
        title: knowledgeBaseArticle.title,
        content: knowledgeBaseArticle.content,
        summary: knowledgeBaseArticle.summary,
        tags: knowledgeBaseArticle.tags,
        categoryId: knowledgeBaseArticle.categoryId,
        userId: knowledgeBaseArticle.userId,
        createdAt: knowledgeBaseArticle.createdAt,
        updatedAt: knowledgeBaseArticle.updatedAt,
        categoryName: knowledgeBaseCategory.name,
      })
      .from(knowledgeBaseArticle)
      .leftJoin(
        knowledgeBaseCategory,
        eq(knowledgeBaseArticle.categoryId, knowledgeBaseCategory.id),
      )
      .orderBy(desc(knowledgeBaseArticle.updatedAt))
      .limit(limit);

    if (categoryId) {
      return await query.where(eq(knowledgeBaseArticle.categoryId, categoryId));
    }

    return await query;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get knowledge base articles',
    );
  }
}

export async function getKnowledgeBaseArticleById({ id }: { id: string }) {
  try {
    const [article] = await db
      .select({
        id: knowledgeBaseArticle.id,
        title: knowledgeBaseArticle.title,
        content: knowledgeBaseArticle.content,
        summary: knowledgeBaseArticle.summary,
        tags: knowledgeBaseArticle.tags,
        categoryId: knowledgeBaseArticle.categoryId,
        userId: knowledgeBaseArticle.userId,
        createdAt: knowledgeBaseArticle.createdAt,
        updatedAt: knowledgeBaseArticle.updatedAt,
        categoryName: knowledgeBaseCategory.name,
      })
      .from(knowledgeBaseArticle)
      .leftJoin(
        knowledgeBaseCategory,
        eq(knowledgeBaseArticle.categoryId, knowledgeBaseCategory.id),
      )
      .where(eq(knowledgeBaseArticle.id, id));
    return article;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get knowledge base article by id',
    );
  }
}

export async function deleteKnowledgeBaseArticle({ id }: { id: string }) {
  try {
    return await db
      .delete(knowledgeBaseArticle)
      .where(eq(knowledgeBaseArticle.id, id))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete knowledge base article',
    );
  }
}

export async function searchKnowledgeBaseArticles({
  query,
  limit = 10,
}: {
  query: string;
  limit?: number;
}) {
  try {
    return await db
      .select({
        id: knowledgeBaseArticle.id,
        title: knowledgeBaseArticle.title,
        content: knowledgeBaseArticle.content,
        summary: knowledgeBaseArticle.summary,
        tags: knowledgeBaseArticle.tags,
        categoryId: knowledgeBaseArticle.categoryId,
        userId: knowledgeBaseArticle.userId,
        createdAt: knowledgeBaseArticle.createdAt,
        updatedAt: knowledgeBaseArticle.updatedAt,
        categoryName: knowledgeBaseCategory.name,
      })
      .from(knowledgeBaseArticle)
      .leftJoin(
        knowledgeBaseCategory,
        eq(knowledgeBaseArticle.categoryId, knowledgeBaseCategory.id),
      )
      .where(
        and(
          ilike(knowledgeBaseArticle.title, `%${query}%`),
          ilike(knowledgeBaseArticle.content, `%${query}%`),
        ),
      )
      .orderBy(desc(knowledgeBaseArticle.updatedAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search knowledge base articles',
    );
  }
}

export async function searchKnowledgeBaseByVector({
  embedding,
  limit = 5,
}: {
  embedding: number[];
  limit?: number;
}) {
  try {
    return await db
      .select({
        id: knowledgeBaseArticle.id,
        title: knowledgeBaseArticle.title,
        content: knowledgeBaseArticle.content,
        summary: knowledgeBaseArticle.summary,
        tags: knowledgeBaseArticle.tags,
        categoryId: knowledgeBaseArticle.categoryId,
        userId: knowledgeBaseArticle.userId,
        createdAt: knowledgeBaseArticle.createdAt,
        updatedAt: knowledgeBaseArticle.updatedAt,
        categoryName: knowledgeBaseCategory.name,
        similarity: sql<number>`1 - (${knowledgeBaseArticle.embedding} <=> ${embedding}::vector)`,
      })
      .from(knowledgeBaseArticle)
      .leftJoin(
        knowledgeBaseCategory,
        eq(knowledgeBaseArticle.categoryId, knowledgeBaseCategory.id),
      )
      .where(sql`${knowledgeBaseArticle.embedding} IS NOT NULL`)
      .orderBy(sql`${knowledgeBaseArticle.embedding} <=> ${embedding}::vector`)
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search knowledge base by vector',
    );
  }
}

// Jira Ticket functions
export async function createJiraTicket({
  issueKey,
  title,
  description,
  status = 'Open',
  priority = 'Medium',
  assignee,
  reporter,
  userId,
  chatId,
}: {
  issueKey: string;
  title: string;
  description: string;
  status?: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  userId: string;
  chatId?: string;
}) {
  try {
    return await db
      .insert(jiraTicket)
      .values({
        issueKey,
        title,
        description,
        status,
        priority,
        assignee,
        reporter,
        userId,
        chatId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create Jira ticket',
    );
  }
}

export async function getJiraTickets({
  userId,
  limit = 50,
}: {
  userId?: string;
  limit?: number;
} = {}) {
  try {
    const query = db
      .select()
      .from(jiraTicket)
      .orderBy(desc(jiraTicket.createdAt))
      .limit(limit);

    if (userId) {
      return await query.where(eq(jiraTicket.userId, userId));
    }

    return await query;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get Jira tickets',
    );
  }
}

export async function getJiraTicketById({ id }: { id: string }) {
  try {
    const [ticket] = await db
      .select()
      .from(jiraTicket)
      .where(eq(jiraTicket.id, id));
    return ticket;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get Jira ticket by id',
    );
  }
}

export async function updateJiraTicket({
  id,
  status,
  priority,
  assignee,
}: {
  id: string;
  status?: string;
  priority?: string;
  assignee?: string;
}) {
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignee !== undefined) updateData.assignee = assignee;

    return await db
      .update(jiraTicket)
      .set(updateData)
      .where(eq(jiraTicket.id, id))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update Jira ticket',
    );
  }
}

export async function searchJiraTickets({
  query,
  status,
  priority,
  assignee,
  userId,
  limit = 20,
}: {
  query?: string;
  status?: string[];
  priority?: string[];
  assignee?: string;
  userId?: string;
  limit?: number;
} = {}) {
  try {
    const conditions = [];

    if (query) {
      conditions.push(
        sql`(${ilike(jiraTicket.title, `%${query}%`)} OR ${ilike(jiraTicket.description, `%${query}%`)})`
      );
    }

    if (status && status.length > 0) {
      conditions.push(sql`${jiraTicket.status} = ANY(${status})`);
    }

    if (priority && priority.length > 0) {
      conditions.push(sql`${jiraTicket.priority} = ANY(${priority})`);
    }

    if (assignee) {
      conditions.push(eq(jiraTicket.assignee, assignee));
    }

    if (userId) {
      conditions.push(eq(jiraTicket.userId, userId));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(jiraTicket)
        .where(and(...conditions))
        .orderBy(desc(jiraTicket.updatedAt))
        .limit(limit);
    } else {
      return await db
        .select()
        .from(jiraTicket)
        .orderBy(desc(jiraTicket.updatedAt))
        .limit(limit);
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search Jira tickets',
    );
  }
}

export async function getJiraTicketByIssueKey({ issueKey }: { issueKey: string }) {
  try {
    const [ticket] = await db
      .select()
      .from(jiraTicket)
      .where(eq(jiraTicket.issueKey, issueKey));
    return ticket;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get Jira ticket by issue key',
    );
  }
}

// KB-Jira Link functions
export async function createKbJiraLink({
  kbArticleId,
  jiraTicketId,
  linkType = 'related',
  createdBy,
}: {
  kbArticleId: string;
  jiraTicketId: string;
  linkType?: string;
  createdBy: string;
}) {
  try {
    return await db
      .insert(kbJiraLink)
      .values({
        kbArticleId,
        jiraTicketId,
        linkType,
        createdBy,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create KB-Jira link',
    );
  }
}

export async function getKbJiraLinks({
  kbArticleId,
  jiraTicketId,
}: {
  kbArticleId?: string;
  jiraTicketId?: string;
} = {}) {
  try {
    const conditions = [];

    if (kbArticleId) {
      conditions.push(eq(kbJiraLink.kbArticleId, kbArticleId));
    }

    if (jiraTicketId) {
      conditions.push(eq(kbJiraLink.jiraTicketId, jiraTicketId));
    }

    if (conditions.length > 0) {
      return await db
        .select({
          id: kbJiraLink.id,
          kbArticleId: kbJiraLink.kbArticleId,
          jiraTicketId: kbJiraLink.jiraTicketId,
          linkType: kbJiraLink.linkType,
          createdBy: kbJiraLink.createdBy,
          createdAt: kbJiraLink.createdAt,
          // KB Article details
          kbTitle: knowledgeBaseArticle.title,
          kbSummary: knowledgeBaseArticle.summary,
          kbCategoryName: knowledgeBaseCategory.name,
          // Jira Ticket details
          jiraIssueKey: jiraTicket.issueKey,
          jiraTitle: jiraTicket.title,
          jiraStatus: jiraTicket.status,
          jiraPriority: jiraTicket.priority,
        })
        .from(kbJiraLink)
        .leftJoin(
          knowledgeBaseArticle,
          eq(kbJiraLink.kbArticleId, knowledgeBaseArticle.id),
        )
        .leftJoin(
          knowledgeBaseCategory,
          eq(knowledgeBaseArticle.categoryId, knowledgeBaseCategory.id),
        )
        .leftJoin(
          jiraTicket,
          eq(kbJiraLink.jiraTicketId, jiraTicket.id),
        )
        .where(and(...conditions))
        .orderBy(desc(kbJiraLink.createdAt));
    } else {
      return await db
        .select({
          id: kbJiraLink.id,
          kbArticleId: kbJiraLink.kbArticleId,
          jiraTicketId: kbJiraLink.jiraTicketId,
          linkType: kbJiraLink.linkType,
          createdBy: kbJiraLink.createdBy,
          createdAt: kbJiraLink.createdAt,
          // KB Article details
          kbTitle: knowledgeBaseArticle.title,
          kbSummary: knowledgeBaseArticle.summary,
          kbCategoryName: knowledgeBaseCategory.name,
          // Jira Ticket details
          jiraIssueKey: jiraTicket.issueKey,
          jiraTitle: jiraTicket.title,
          jiraStatus: jiraTicket.status,
          jiraPriority: jiraTicket.priority,
        })
        .from(kbJiraLink)
        .leftJoin(
          knowledgeBaseArticle,
          eq(kbJiraLink.kbArticleId, knowledgeBaseArticle.id),
        )
        .leftJoin(
          knowledgeBaseCategory,
          eq(knowledgeBaseArticle.categoryId, knowledgeBaseCategory.id),
        )
        .leftJoin(
          jiraTicket,
          eq(kbJiraLink.jiraTicketId, jiraTicket.id),
        )
        .orderBy(desc(kbJiraLink.createdAt));
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get KB-Jira links',
    );
  }
}

export async function deleteKbJiraLink({
  kbArticleId,
  jiraTicketId,
}: {
  kbArticleId: string;
  jiraTicketId: string;
}) {
  try {
    return await db
      .delete(kbJiraLink)
      .where(
        and(
          eq(kbJiraLink.kbArticleId, kbArticleId),
          eq(kbJiraLink.jiraTicketId, jiraTicketId),
        ),
      )
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete KB-Jira link',
    );
  }
}

// Jira Ticket Sync functions
export async function createJiraTicketSync({
  ticketId,
  syncStatus = 'success',
  syncError,
  jiraUpdatedAt,
  fieldsHash,
}: {
  ticketId: string;
  syncStatus?: string;
  syncError?: string;
  jiraUpdatedAt?: Date;
  fieldsHash?: string;
}) {
  try {
    return await db
      .insert(jiraTicketSync)
      .values({
        ticketId,
        lastSyncAt: new Date(),
        syncStatus,
        syncError,
        jiraUpdatedAt,
        fieldsHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create Jira ticket sync record',
    );
  }
}

export async function updateJiraTicketSync({
  ticketId,
  syncStatus,
  syncError,
  jiraUpdatedAt,
  fieldsHash,
}: {
  ticketId: string;
  syncStatus?: string;
  syncError?: string;
  jiraUpdatedAt?: Date;
  fieldsHash?: string;
}) {
  try {
    const updateData: any = {
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    };

    if (syncStatus !== undefined) updateData.syncStatus = syncStatus;
    if (syncError !== undefined) updateData.syncError = syncError;
    if (jiraUpdatedAt !== undefined) updateData.jiraUpdatedAt = jiraUpdatedAt;
    if (fieldsHash !== undefined) updateData.fieldsHash = fieldsHash;

    return await db
      .update(jiraTicketSync)
      .set(updateData)
      .where(eq(jiraTicketSync.ticketId, ticketId))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update Jira ticket sync record',
    );
  }
}

export async function getJiraTicketSync({ ticketId }: { ticketId: string }) {
  try {
    const [sync] = await db
      .select()
      .from(jiraTicketSync)
      .where(eq(jiraTicketSync.ticketId, ticketId));
    return sync;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get Jira ticket sync record',
    );
  }
}

export async function getTicketsNeedingSync({
  olderThan = new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  limit = 50,
}: {
  olderThan?: Date;
  limit?: number;
} = {}) {
  try {
    return await db
      .select({
        ticketId: jiraTicket.id,
        issueKey: jiraTicket.issueKey,
        lastSyncAt: jiraTicketSync.lastSyncAt,
        syncStatus: jiraTicketSync.syncStatus,
      })
      .from(jiraTicket)
      .leftJoin(jiraTicketSync, eq(jiraTicket.id, jiraTicketSync.ticketId))
      .where(
        sql`${jiraTicketSync.lastSyncAt} IS NULL OR ${jiraTicketSync.lastSyncAt} < ${olderThan}`
      )
      .orderBy(asc(jiraTicketSync.lastSyncAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get tickets needing sync',
    );
  }
}