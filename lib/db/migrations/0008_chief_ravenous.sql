CREATE TABLE IF NOT EXISTS "KbUsageAnalytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"articleId" uuid NOT NULL,
	"userId" uuid,
	"action" varchar(50) NOT NULL,
	"metadata" text,
	"sessionId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KbUsageAnalytics" ADD CONSTRAINT "KbUsageAnalytics_articleId_KnowledgeBaseArticle_id_fk" FOREIGN KEY ("articleId") REFERENCES "public"."KnowledgeBaseArticle"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KbUsageAnalytics" ADD CONSTRAINT "KbUsageAnalytics_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
