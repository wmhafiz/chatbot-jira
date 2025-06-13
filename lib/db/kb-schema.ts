import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  uuid,
  text,
  primaryKey,
  foreignKey,
  vector,
} from 'drizzle-orm/pg-core';
import { user } from './schema';

export const knowledgeBaseCategory = pgTable('KnowledgeBaseCategory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type KnowledgeBaseCategory = InferSelectModel<typeof knowledgeBaseCategory>;

export const knowledgeBaseArticle = pgTable('KnowledgeBaseArticle', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  summary: text('summary'),
  tags: text('tags'), // JSON array of tags
  categoryId: uuid('categoryId')
    .notNull()
    .references(() => knowledgeBaseCategory.id),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI embedding dimensions
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type KnowledgeBaseArticle = InferSelectModel<typeof knowledgeBaseArticle>;

export const jiraTicket = pgTable('JiraTicket', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  issueKey: varchar('issueKey', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('Open'),
  priority: varchar('priority', { length: 20 }).notNull().default('Medium'),
  assignee: varchar('assignee', { length: 100 }),
  reporter: varchar('reporter', { length: 100 }),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  chatId: uuid('chatId'), // Optional reference to the chat that created this ticket
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type JiraTicket = InferSelectModel<typeof jiraTicket>;

export const kbUsageAnalytics = pgTable('KbUsageAnalytics', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  articleId: uuid('articleId')
    .notNull()
    .references(() => knowledgeBaseArticle.id),
  userId: uuid('userId')
    .references(() => user.id),
  action: varchar('action', { length: 50 }).notNull(), // 'view', 'search', 'helpful', 'not_helpful'
  metadata: text('metadata'), // JSON string for additional data
  sessionId: varchar('sessionId', { length: 255 }), // Optional session tracking
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type KbUsageAnalytics = InferSelectModel<typeof kbUsageAnalytics>;

// KB-Jira linking table
export const kbJiraLink = pgTable('KbJiraLink', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  kbArticleId: uuid('kbArticleId')
    .notNull()
    .references(() => knowledgeBaseArticle.id, { onDelete: 'cascade' }),
  jiraTicketId: uuid('jiraTicketId')
    .notNull()
    .references(() => jiraTicket.id, { onDelete: 'cascade' }),
  linkType: varchar('linkType', { length: 50 }).notNull().default('related'), // 'related', 'resolves', 'references'
  createdBy: uuid('createdBy')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique KB-Jira pairs
  uniqueKbJiraLink: primaryKey({ columns: [table.kbArticleId, table.jiraTicketId] }),
}));

export type KbJiraLink = InferSelectModel<typeof kbJiraLink>;

// Jira ticket sync metadata
export const jiraTicketSync = pgTable('JiraTicketSync', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  ticketId: uuid('ticketId')
    .notNull()
    .references(() => jiraTicket.id, { onDelete: 'cascade' }),
  lastSyncAt: timestamp('lastSyncAt').notNull().defaultNow(),
  syncStatus: varchar('syncStatus', { length: 20 }).notNull().default('success'), // 'success', 'failed', 'pending'
  syncError: text('syncError'), // Error message if sync failed
  jiraUpdatedAt: timestamp('jiraUpdatedAt'), // Last updated timestamp from Jira
  fieldsHash: varchar('fieldsHash', { length: 64 }), // Hash of key fields to detect changes
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type JiraTicketSync = InferSelectModel<typeof jiraTicketSync>;