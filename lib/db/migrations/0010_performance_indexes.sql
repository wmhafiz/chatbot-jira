-- Performance optimization indexes for the Production Support Chatbot
-- This migration adds indexes for frequently queried columns to improve performance

-- Knowledge Base indexes
CREATE INDEX IF NOT EXISTS idx_kb_articles_category_id ON "KnowledgeBaseArticle" ("categoryId");
CREATE INDEX IF NOT EXISTS idx_kb_articles_created_at ON "KnowledgeBaseArticle" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_kb_articles_updated_at ON "KnowledgeBaseArticle" ("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_kb_articles_title_search ON "KnowledgeBaseArticle" USING gin(to_tsvector('english', "title"));
CREATE INDEX IF NOT EXISTS idx_kb_articles_content_search ON "KnowledgeBaseArticle" USING gin(to_tsvector('english', "content"));
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON "KnowledgeBaseArticle" USING gin("tags");

-- Knowledge Base Categories indexes
CREATE INDEX IF NOT EXISTS idx_kb_categories_name ON "KnowledgeBaseCategory" ("name");
CREATE INDEX IF NOT EXISTS idx_kb_categories_created_at ON "KnowledgeBaseCategory" ("createdAt" DESC);

-- Jira Tickets indexes
CREATE INDEX IF NOT EXISTS idx_jira_tickets_key ON "JiraTicket" ("key");
CREATE INDEX IF NOT EXISTS idx_jira_tickets_project_key ON "JiraTicket" ("projectKey");
CREATE INDEX IF NOT EXISTS idx_jira_tickets_status ON "JiraTicket" ("status");
CREATE INDEX IF NOT EXISTS idx_jira_tickets_priority ON "JiraTicket" ("priority");
CREATE INDEX IF NOT EXISTS idx_jira_tickets_assignee ON "JiraTicket" ("assignee");
CREATE INDEX IF NOT EXISTS idx_jira_tickets_reporter ON "JiraTicket" ("reporter");
CREATE INDEX IF NOT EXISTS idx_jira_tickets_created_at ON "JiraTicket" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_jira_tickets_updated_at ON "JiraTicket" ("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_jira_tickets_summary_search ON "JiraTicket" USING gin(to_tsvector('english', "summary"));
CREATE INDEX IF NOT EXISTS idx_jira_tickets_description_search ON "JiraTicket" USING gin(to_tsvector('english', "description"));

-- Chat and Message indexes for analytics
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON "Chat" ("userId");
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON "Chat" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_chat_visibility ON "Chat" ("visibility");

CREATE INDEX IF NOT EXISTS idx_message_v2_chat_id ON "Message_v2" ("chatId");
CREATE INDEX IF NOT EXISTS idx_message_v2_created_at ON "Message_v2" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_message_v2_role ON "Message_v2" ("role");

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_document_user_id ON "Document" ("userId");
CREATE INDEX IF NOT EXISTS idx_document_kind ON "Document" ("kind");
CREATE INDEX IF NOT EXISTS idx_document_title_search ON "Document" USING gin(to_tsvector('english', "title"));

-- Suggestion indexes
CREATE INDEX IF NOT EXISTS idx_suggestion_document_id ON "Suggestion" ("documentId");
CREATE INDEX IF NOT EXISTS idx_suggestion_user_id ON "Suggestion" ("userId");
CREATE INDEX IF NOT EXISTS idx_suggestion_is_resolved ON "Suggestion" ("isResolved");
CREATE INDEX IF NOT EXISTS idx_suggestion_created_at ON "Suggestion" ("createdAt" DESC);

-- Vote indexes
CREATE INDEX IF NOT EXISTS idx_vote_v2_chat_id ON "Vote_v2" ("chatId");
CREATE INDEX IF NOT EXISTS idx_vote_v2_message_id ON "Vote_v2" ("messageId");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_kb_articles_category_created ON "KnowledgeBaseArticle" ("categoryId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_jira_tickets_project_status ON "JiraTicket" ("projectKey", "status");
CREATE INDEX IF NOT EXISTS idx_jira_tickets_assignee_status ON "JiraTicket" ("assignee", "status");
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON "Chat" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_message_chat_created ON "Message_v2" ("chatId", "createdAt" DESC);

-- Partial indexes for active/open items
CREATE INDEX IF NOT EXISTS idx_jira_tickets_open ON "JiraTicket" ("projectKey", "updatedAt" DESC) 
  WHERE "status" NOT IN ('Done', 'Closed', 'Resolved');

-- Vector search optimization (if using pgvector extension)
-- Note: These would be added if implementing vector embeddings directly in PostgreSQL
-- CREATE INDEX IF NOT EXISTS idx_kb_articles_embedding ON "KnowledgeBaseArticle" USING ivfflat ("embedding" vector_cosine_ops);