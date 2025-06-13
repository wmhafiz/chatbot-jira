-- Add KB-Jira linking table
CREATE TABLE IF NOT EXISTS "KbJiraLink" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kbArticleId" uuid NOT NULL,
	"jiraTicketId" uuid NOT NULL,
	"linkType" varchar(50) DEFAULT 'related' NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "KbJiraLink_kbArticleId_jiraTicketId_pk" PRIMARY KEY("kbArticleId","jiraTicketId")
);
--> statement-breakpoint

-- Add Jira ticket sync metadata table
CREATE TABLE IF NOT EXISTS "JiraTicketSync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticketId" uuid NOT NULL,
	"lastSyncAt" timestamp DEFAULT now() NOT NULL,
	"syncStatus" varchar(20) DEFAULT 'success' NOT NULL,
	"syncError" text,
	"jiraUpdatedAt" timestamp,
	"fieldsHash" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "KbJiraLink" ADD CONSTRAINT "KbJiraLink_kbArticleId_KnowledgeBaseArticle_id_fk" FOREIGN KEY ("kbArticleId") REFERENCES "KnowledgeBaseArticle"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "KbJiraLink" ADD CONSTRAINT "KbJiraLink_jiraTicketId_JiraTicket_id_fk" FOREIGN KEY ("jiraTicketId") REFERENCES "JiraTicket"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "KbJiraLink" ADD CONSTRAINT "KbJiraLink_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "JiraTicketSync" ADD CONSTRAINT "JiraTicketSync_ticketId_JiraTicket_id_fk" FOREIGN KEY ("ticketId") REFERENCES "JiraTicket"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "KbJiraLink_kbArticleId_idx" ON "KbJiraLink" ("kbArticleId");
CREATE INDEX IF NOT EXISTS "KbJiraLink_jiraTicketId_idx" ON "KbJiraLink" ("jiraTicketId");
CREATE INDEX IF NOT EXISTS "KbJiraLink_linkType_idx" ON "KbJiraLink" ("linkType");
CREATE INDEX IF NOT EXISTS "JiraTicketSync_ticketId_idx" ON "JiraTicketSync" ("ticketId");
CREATE INDEX IF NOT EXISTS "JiraTicketSync_lastSyncAt_idx" ON "JiraTicketSync" ("lastSyncAt");
CREATE INDEX IF NOT EXISTS "JiraTicketSync_syncStatus_idx" ON "JiraTicketSync" ("syncStatus");

-- Add indexes to existing JiraTicket table for better search performance
CREATE INDEX IF NOT EXISTS "JiraTicket_issueKey_idx" ON "JiraTicket" ("issueKey");
CREATE INDEX IF NOT EXISTS "JiraTicket_status_idx" ON "JiraTicket" ("status");
CREATE INDEX IF NOT EXISTS "JiraTicket_priority_idx" ON "JiraTicket" ("priority");
CREATE INDEX IF NOT EXISTS "JiraTicket_assignee_idx" ON "JiraTicket" ("assignee");
CREATE INDEX IF NOT EXISTS "JiraTicket_userId_idx" ON "JiraTicket" ("userId");
CREATE INDEX IF NOT EXISTS "JiraTicket_createdAt_idx" ON "JiraTicket" ("createdAt");
CREATE INDEX IF NOT EXISTS "JiraTicket_updatedAt_idx" ON "JiraTicket" ("updatedAt");