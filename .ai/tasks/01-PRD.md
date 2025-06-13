# Production Support Chatbot with Next.js 15 & Vercel Postgres Build Prompt

## Project Overview

Build a production support chatbot using Next.js 15, Server Components/Actions, shadcn/ui, and Vercel AI SDK with Vercel Postgres for knowledge base storage. The system includes both a chat interface and a comprehensive KB management UI with vector search capabilities.

## Tech Stack

- **Frontend/Backend**: Next.js 15 (App Router)
- **API Layer**: Server Components & Server Actions
- **Database**: Vercel Postgres (PostgreSQL)
- **ORM**: Drizzle ORM
- **Vector Search**: pgvector extension + OpenAI Embeddings
- **UI Components**: shadcn/ui
- **AI Integration**: Vercel AI SDK
- **Issue Tracking**: Jira API
- **Deployment**: Vercel

## Core Features

### 1. Dual Interface System

- **Chat Interface**: AI-powered conversational support
- **KB Management UI**: Browse, create, edit, and manage knowledge base entries
- **Unified Search**: Vector similarity search across both interfaces

### 2. Database Schema (Drizzle ORM)

**Note on Vector Database**: Vercel Postgres supports the `pgvector` extension, but there are some limitations compared to specialized vector databases:

- Vector similarity search is available but may have performance constraints at scale
- Index tuning for vector operations requires careful configuration
- Consider implementing hybrid search (vector + full-text) for better results

```typescript
// lib/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  varchar,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Categories table
export const kbCategories = pgTable("kb_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default("#3B82F6"),
  icon: text("icon").default("folder"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Knowledge base entries
export const kbEntries = pgTable(
  "kb_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    summary: text("summary"),
    categoryId: uuid("category_id").references(() => kbCategories.id, {
      onDelete: "set null",
    }),
    severity: varchar("severity", {
      enum: ["low", "medium", "high", "critical"],
    }).default("medium"),
    status: varchar("status", {
      enum: ["draft", "active", "deprecated", "archived"],
    }).default("active"),
    tags: text("tags")
      .array()
      .default(sql`'{}'::text[]`),
    version: integer("version").default(1),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    // Vector embedding for semantic search (stored as text, parsed as float array)
    embedding: text("embedding"), // JSON string of float array
  },
  (table) => ({
    categoryIdx: index("idx_kb_entries_category").on(table.categoryId),
    statusIdx: index("idx_kb_entries_status").on(table.status),
    createdAtIdx: index("idx_kb_entries_created_at").on(table.createdAt),
  })
);

// Jira tickets
export const jiraTickets = pgTable(
  "jira_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketKey: text("ticket_key").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status"),
    priority: text("priority"),
    issueType: text("issue_type"),
    assignee: text("assignee"),
    reporter: text("reporter"),
    projectKey: text("project_key"),
    createdDate: timestamp("created_date", { withTimezone: true }),
    updatedDate: timestamp("updated_date", { withTimezone: true }),
    resolvedDate: timestamp("resolved_date", { withTimezone: true }),
    jiraUrl: text("jira_url"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    ticketKeyIdx: index("idx_jira_tickets_key").on(table.ticketKey),
  })
);

// Many-to-many relationship between KB entries and Jira tickets
export const kbJiraLinks = pgTable(
  "kb_jira_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kbEntryId: uuid("kb_entry_id").references(() => kbEntries.id, {
      onDelete: "cascade",
    }),
    jiraTicketId: uuid("jira_ticket_id").references(() => jiraTickets.id, {
      onDelete: "cascade",
    }),
    linkType: varchar("link_type", {
      enum: ["related", "solves", "caused_by", "duplicate"],
    }).default("related"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueLink: unique().on(table.kbEntryId, table.jiraTicketId),
    entryIdx: index("idx_kb_jira_links_entry").on(table.kbEntryId),
    ticketIdx: index("idx_kb_jira_links_ticket").on(table.jiraTicketId),
  })
);

// Entry version history
export const kbEntryVersions = pgTable("kb_entry_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  kbEntryId: uuid("kb_entry_id").references(() => kbEntries.id, {
    onDelete: "cascade",
  }),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  changeNotes: text("change_notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Usage analytics
export const kbUsageAnalytics = pgTable("kb_usage_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  kbEntryId: uuid("kb_entry_id").references(() => kbEntries.id, {
    onDelete: "cascade",
  }),
  eventType: varchar("event_type", {
    enum: ["view", "search_result", "chat_referenced", "jira_linked"],
  }),
  userId: text("user_id"),
  sessionId: text("session_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Type exports
export type KbCategory = typeof kbCategories.$inferSelect;
export type KbEntry = typeof kbEntries.$inferSelect;
export type JiraTicket = typeof jiraTickets.$inferSelect;
export type KbJiraLink = typeof kbJiraLinks.$inferSelect;
export type KbEntryVersion = typeof kbEntryVersions.$inferSelect;
export type KbUsageAnalytic = typeof kbUsageAnalytics.$inferSelect;
```

**Vector Search Implementation Notes:**

- Embeddings are stored as JSON strings and parsed as float arrays in application code
- Vector similarity search is implemented using custom SQL with cosine similarity
- Full-text search uses PostgreSQL's built-in `tsvector` capabilities
- Hybrid search combines both approaches for optimal results

## File Structure

```
ai-chatbot/
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema (updated with KB tables)
│   │   ├── queries.ts            # Database queries
│   │   ├── migrate.ts            # Migration runner
│   │   └── migrations/           # SQL migration files
│   ├── ai/
│   │   ├── tools/
│   │   │   ├── kb-search.ts      # KB semantic search tool
│   │   │   ├── kb-create.ts      # KB entry creation tool
│   │   │   ├── kb-update.ts      # KB entry update tool
│   │   │   ├── jira-search.ts    # Jira ticket search tool
│   │   │   └── jira-comment.ts   # Jira comment tool
│   │   ├── embeddings.ts         # Vector embedding generation
│   │   └── prompts.ts            # System prompts
│   ├── integrations/
│   │   └── jira.ts               # Jira API client
│   ├── actions/
│   │   ├── kb.ts                 # KB server actions
│   │   ├── jira.ts               # Jira server actions
│   │   ├── categories.ts         # Category management actions
│   │   └── analytics.ts          # Usage analytics actions
│   ├── utils.ts
│   └── validations.ts            # Zod schemas
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # AI chat endpoint (existing)
│   │   └── webhooks/
│   │       └── jira/route.ts     # Jira webhook handler
│   ├── (chat)/                   # Existing chat routes
│   │   ├── page.tsx              # Enhanced with KB tools
│   │   └── chat/[id]/page.tsx
│   ├── kb/
│   │   ├── page.tsx              # KB browse/search
│   │   ├── new/
│   │   │   └── page.tsx          # Create new entry
│   │   ├── [id]/
│   │   │   ├── page.tsx          # View entry
│   │   │   └── edit/
│   │   │       └── page.tsx      # Edit entry
│   │   └── categories/
│   │       └── page.tsx          # Manage categories
│   ├── layout.tsx                # Updated with KB navigation
│   └── page.tsx                  # Dashboard/home
├── components/
│   ├── ui/                       # shadcn components (existing)
│   ├── chat/                     # Enhanced chat components
│   │   ├── tool-results/
│   │   │   ├── kb-result.tsx     # KB search results display
│   │   │   └── jira-result.tsx   # Jira ticket display
│   │   └── ...                   # Existing chat components
│   ├── kb/
│   │   ├── entry-list.tsx
│   │   ├── entry-card.tsx
│   │   ├── entry-form.tsx
│   │   ├── entry-viewer.tsx
│   │   ├── category-selector.tsx
│   │   ├── jira-ticket-selector.tsx
│   │   ├── tag-input.tsx
│   │   └── search-interface.tsx
│   ├── jira/
│   │   ├── ticket-card.tsx
│   │   └── ticket-search.tsx
│   └── layout/
│       ├── sidebar.tsx           # Updated with KB links
│       └── navbar.tsx
├── types/
│   ├── kb.ts
│   ├── jira.ts
│   └── chat.ts
├── package.json
└── README.md
```

## Server Actions Definitions

### KB Actions (`lib/actions/kb.ts`)

```typescript
"use server";

import { z } from "zod";
import { db } from "@/lib/db/queries";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { kbEntries, kbCategories, kbJiraLinks } from "@/lib/db/schema";
import { eq, and, desc, ilike, inArray } from "drizzle-orm";

// Input validation schemas
const listKbEntriesSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["draft", "active", "deprecated", "archived"]).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

const createKbEntrySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  tags: z.array(z.string()),
  jiraTicketIds: z.array(z.string().uuid()).optional(),
});

const updateKbEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  tags: z.array(z.string()).optional(),
  changeNotes: z.string().optional(),
});

const searchKbEntriesSchema = z.object({
  query: z.string().min(1),
  limit: z.number().default(10),
  threshold: z.number().default(0.8),
  categoryId: z.string().uuid().optional(),
});

// List entries with pagination and filters
export async function listKbEntries(
  input: z.infer<typeof listKbEntriesSchema>
) {
  const validated = listKbEntriesSchema.parse(input);
  const { page, limit, categoryId, status, tags, search } = validated;

  try {
    let query = db.select().from(kbEntries);

    // Apply filters
    const conditions = [];
    if (categoryId) conditions.push(eq(kbEntries.categoryId, categoryId));
    if (status) conditions.push(eq(kbEntries.status, status));
    if (search) conditions.push(ilike(kbEntries.title, `%${search}%`));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const entries = await query
      .orderBy(desc(kbEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: "Failed to fetch KB entries" };
  }
}

// Get single entry by ID
export async function getKbEntryById(id: string) {
  try {
    const entry = await db
      .select()
      .from(kbEntries)
      .where(eq(kbEntries.id, id))
      .limit(1);

    if (entry.length === 0) {
      return { success: false, error: "Entry not found" };
    }

    return { success: true, data: entry[0] };
  } catch (error) {
    return { success: false, error: "Failed to fetch KB entry" };
  }
}

// Create new entry
export async function createKbEntry(
  input: z.infer<typeof createKbEntrySchema>
) {
  const validated = createKbEntrySchema.parse(input);

  try {
    // Generate embedding for the content
    const embedding = await generateEmbedding(validated.content);

    const [newEntry] = await db
      .insert(kbEntries)
      .values({
        ...validated,
        embedding: JSON.stringify(embedding),
      })
      .returning();

    // Link Jira tickets if provided
    if (validated.jiraTicketIds?.length) {
      await db.insert(kbJiraLinks).values(
        validated.jiraTicketIds.map((ticketId) => ({
          kbEntryId: newEntry.id,
          jiraTicketId: ticketId,
        }))
      );
    }

    return { success: true, data: newEntry };
  } catch (error) {
    return { success: false, error: "Failed to create KB entry" };
  }
}

// Update entry
export async function updateKbEntry(
  input: z.infer<typeof updateKbEntrySchema>
) {
  const validated = updateKbEntrySchema.parse(input);
  const { id, ...updates } = validated;

  try {
    // Regenerate embedding if content changed
    if (updates.content) {
      const embedding = await generateEmbedding(updates.content);
      updates.embedding = JSON.stringify(embedding);
    }

    const [updatedEntry] = await db
      .update(kbEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(kbEntries.id, id))
      .returning();

    return { success: true, data: updatedEntry };
  } catch (error) {
    return { success: false, error: "Failed to update KB entry" };
  }
}

// Vector similarity search
export async function searchKbEntries(
  input: z.infer<typeof searchKbEntriesSchema>
) {
  const validated = searchKbEntriesSchema.parse(input);

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(validated.query);

    // Perform vector similarity search using raw SQL
    const results = await db.execute(sql`
      SELECT *,
        1 - (embedding::vector <=> ${JSON.stringify(
          queryEmbedding
        )}::vector) as similarity
      FROM kb_entries
      WHERE 1 - (embedding::vector <=> ${JSON.stringify(
        queryEmbedding
      )}::vector) > ${validated.threshold}
      ${
        validated.categoryId
          ? sql`AND category_id = ${validated.categoryId}`
          : sql``
      }
      ORDER BY similarity DESC
      LIMIT ${validated.limit}
    `);

    return { success: true, data: results.rows };
  } catch (error) {
    return { success: false, error: "Failed to search KB entries" };
  }
}
```

### Jira Actions (`lib/actions/jira.ts`)

```typescript
"use server";

import { z } from "zod";
import { JiraClient } from "@/lib/integrations/jira";
import { db } from "@/lib/db/queries";
import { jiraTickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const searchTicketsSchema = z.object({
  jql: z.string(),
  maxResults: z.number().default(50),
  startAt: z.number().default(0),
});

const addCommentSchema = z.object({
  ticketKey: z.string(),
  comment: z.string(),
  visibility: z.enum(["public", "internal"]).default("public"),
});

// Search tickets with JQL
export async function searchJiraTickets(
  input: z.infer<typeof searchTicketsSchema>
) {
  const validated = searchTicketsSchema.parse(input);

  try {
    const jira = new JiraClient();
    const results = await jira.searchTickets(
      validated.jql,
      validated.maxResults,
      validated.startAt
    );

    // Sync tickets to local database
    for (const ticket of results.issues) {
      await db
        .insert(jiraTickets)
        .values({
          ticketKey: ticket.key,
          title: ticket.fields.summary,
          description: ticket.fields.description,
          status: ticket.fields.status.name,
          priority: ticket.fields.priority?.name,
          issueType: ticket.fields.issuetype.name,
          assignee: ticket.fields.assignee?.displayName,
          reporter: ticket.fields.reporter?.displayName,
          projectKey: ticket.fields.project.key,
          createdDate: new Date(ticket.fields.created),
          updatedDate: new Date(ticket.fields.updated),
          jiraUrl: `${process.env.JIRA_BASE_URL}/browse/${ticket.key}`,
        })
        .onConflictDoUpdate({
          target: jiraTickets.ticketKey,
          set: {
            title: ticket.fields.summary,
            status: ticket.fields.status.name,
            updatedDate: new Date(ticket.fields.updated),
            syncedAt: new Date(),
          },
        });
    }

    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: "Failed to search Jira tickets" };
  }
}

// Get ticket by key
export async function getJiraTicket(ticketKey: string) {
  try {
    const ticket = await db
      .select()
      .from(jiraTickets)
      .where(eq(jiraTickets.ticketKey, ticketKey))
      .limit(1);

    if (ticket.length === 0) {
      return { success: false, error: "Ticket not found" };
    }

    return { success: true, data: ticket[0] };
  } catch (error) {
    return { success: false, error: "Failed to fetch Jira ticket" };
  }
}

// Add comment to ticket
export async function addJiraComment(input: z.infer<typeof addCommentSchema>) {
  const validated = addCommentSchema.parse(input);

  try {
    const jira = new JiraClient();
    const result = await jira.addComment(
      validated.ticketKey,
      validated.comment,
      validated.visibility
    );

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to add comment to Jira ticket" };
  }
}
```

## AI Tools Implementation

### Enhanced Tool Definitions

```typescript
// lib/ai/tools/kb-search.ts
import { z } from "zod";
import { searchKbEntries } from "@/lib/actions/kb";

export const kbSearchTool = {
  description: "Search knowledge base using semantic similarity",
  parameters: z.object({
    query: z.string().describe("Search query or problem description"),
    limit: z.number().default(5),
    threshold: z.number().default(0.7),
    categoryId: z.string().optional(),
  }),
  execute: async ({ query, limit, threshold, categoryId }) => {
    const result = await searchKbEntries({
      query,
      limit,
      threshold,
      categoryId,
    });

    if (!result.success) {
      return { error: result.error };
    }

    return {
      results: result.data.map((entry) => ({
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        similarity: entry.similarity,
        category: entry.categoryId,
      })),
    };
  },
};

// lib/ai/tools/kb-create.ts
import { z } from "zod";
import { createKbEntry } from "@/lib/actions/kb";

export const kbCreateTool = {
  description: "Create new knowledge base entry",
  parameters: z.object({
    title: z.string(),
    content: z.string(),
    summary: z.string().optional(),
    categoryId: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    tags: z.array(z.string()),
    jiraTicketIds: z.array(z.string()).optional(),
  }),
  execute: async (params) => {
    const result = await createKbEntry(params);

    if (!result.success) {
      return { error: result.error };
    }

    return {
      success: true,
      entry: {
        id: result.data.id,
        title: result.data.title,
        summary: result.data.summary,
      },
    };
  },
};

// lib/ai/tools/jira-search.ts
import { z } from "zod";
import { searchJiraTickets } from "@/lib/actions/jira";

export const jiraSearchTool = {
  description: "Search Jira tickets using JQL",
  parameters: z.object({
    jql: z.string().describe("JQL query string"),
    maxResults: z.number().default(20),
  }),
  execute: async ({ jql, maxResults }) => {
    const result = await searchJiraTickets({ jql, maxResults });

    if (!result.success) {
      return { error: result.error };
    }

    return {
      tickets: result.data.issues.map((issue) => ({
        key: issue.key,
        title: issue.fields.summary,
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        url: `${process.env.JIRA_BASE_URL}/browse/${issue.key}`,
      })),
      total: result.data.total,
    };
  },
};

// lib/ai/tools/index.ts - Tool registry
export const aiTools = {
  kb_search_semantic: kbSearchTool,
  kb_create_entry: kbCreateTool,
  jira_search_tickets: jiraSearchTool,
  // Add other tools as needed
};
```

## Frontend Components

### KB Management Interface

```typescript
// components/kb/entry-form.tsx
"use client";

import { useState, useTransition } from "react";
import { createKbEntry, updateKbEntry } from "@/lib/actions/kb";
import { KbEntry } from "@/lib/db/schema";

export function EntryForm({
  initialData,
  mode = "create",
}: {
  initialData?: KbEntry;
  mode?: "create" | "edit";
}) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    content: initialData?.content || "",
    summary: initialData?.summary || "",
    categoryId: initialData?.categoryId || "",
    severity: initialData?.severity || "medium",
    tags: initialData?.tags || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      if (mode === "create") {
        const result = await createKbEntry(formData);
        if (result.success) {
          // Handle success (redirect, show toast, etc.)
        }
      } else if (initialData) {
        const result = await updateKbEntry({
          id: initialData.id,
          ...formData,
        });
        if (result.success) {
          // Handle success
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title input */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300"
          required
        />
      </div>

      {/* Content editor */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium">
          Content
        </label>
        <textarea
          id="content"
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          rows={10}
          className="mt-1 block w-full rounded-md border-gray-300"
          required
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
      >
        {isPending
          ? "Saving..."
          : mode === "create"
          ? "Create Entry"
          : "Update Entry"}
      </button>
    </form>
  );
}
```

### Vector Search Interface

```typescript
// components/kb/search-interface.tsx
"use client";

import { useState, useEffect } from "react";
import { searchKbEntries } from "@/lib/actions/kb";
import { KbEntry } from "@/lib/db/schema";

export function SearchInterface() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KbEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      const result = await searchKbEntries({ query, limit: 10 });

      if (result.success) {
        setResults(result.data);
      }
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div>
        <input
          type="text"
          placeholder="Search knowledge base..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

      {/* Search results */}
      <div className="space-y-3">
        {results.map((entry) => (
          <div
            key={entry.id}
            className="border rounded-lg p-4 hover:bg-gray-50"
          >
            <h3 className="font-semibold text-lg">{entry.title}</h3>
            {entry.summary && (
              <p className="text-gray-600 mt-1">{entry.summary}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-gray-500">
                Similarity: {((entry as any).similarity * 100).toFixed(1)}%
              </span>
              <div className="space-x-2">
                <button className="text-blue-600 hover:underline">View</button>
                <button className="text-green-600 hover:underline">Edit</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No results */}
      {query.length >= 3 && !isLoading && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
```

### Jira Integration UI

```typescript
// components/jira/ticket-selector.tsx
"use client";

import { useState, useEffect } from "react";
import { searchJiraTickets } from "@/lib/actions/jira";

interface JiraTicket {
  key: string;
  title: string;
  status: string;
  priority?: string;
}

interface JiraTicketSelectorProps {
  selectedTickets: string[];
  onSelectionChange: (tickets: string[]) => void;
}

export function JiraTicketSelector({
  selectedTickets,
  onSelectionChange,
}: JiraTicketSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setTickets([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      const result = await searchJiraTickets({
        jql: `text ~ "${searchTerm}"`,
        maxResults: 20,
      });

      if (result.success) {
        setTickets(result.data.tickets);
      }
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm]);

  const toggleTicket = (ticketKey: string) => {
    if (selectedTickets.includes(ticketKey)) {
      onSelectionChange(selectedTickets.filter((key) => key !== ticketKey));
    } else {
      onSelectionChange([...selectedTickets, ticketKey]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div>
        <input
          type="text"
          placeholder="Search Jira tickets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      {/* Selected tickets */}
      {selectedTickets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTickets.map((ticketKey) => (
            <span
              key={ticketKey}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm flex items-center gap-1"
            >
              {ticketKey}
              <button
                onClick={() => toggleTicket(ticketKey)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search results */}
      {isLoading && <div className="text-center py-2">Searching...</div>}

      <div className="max-h-60 overflow-y-auto space-y-2">
        {tickets.map((ticket) => (
          <div
            key={ticket.key}
            className={`border rounded-md p-3 cursor-pointer hover:bg-gray-50 ${
              selectedTickets.includes(ticket.key)
                ? "bg-blue-50 border-blue-300"
                : ""
            }`}
            onClick={() => toggleTicket(ticket.key)}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{ticket.key}</span>
                <span className="ml-2 text-gray-600">{ticket.title}</span>
              </div>
              <div className="text-sm text-gray-500">
                {ticket.status} {ticket.priority && `• ${ticket.priority}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Environment Variables

```env
# Database (Vercel Postgres)
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NO_SSL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."

# Jira Integration
JIRA_BASE_URL="https://your-company.atlassian.net"
JIRA_EMAIL="service-account@company.com"
JIRA_API_TOKEN="your-jira-token"

# AI Services
OPENAI_API_KEY="your-openai-key"

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Vector Database Configuration
VECTOR_DIMENSIONS=1536  # OpenAI embedding dimensions
VECTOR_SIMILARITY_THRESHOLD=0.7
```

**Note on Vercel Postgres Setup:**

- Vercel Postgres automatically provides the connection URLs when you add the integration
- The `pgvector` extension needs to be enabled manually in your database
- Consider using connection pooling for production workloads

## Implementation Phases

### Phase 1: Foundation & Database (Week 1)

1. **Database Setup**

   - Enable `pgvector` extension in Vercel Postgres
   - Create new Drizzle schema with KB tables
   - Run database migrations
   - Set up vector embedding utilities

2. **Server Actions Setup**
   - Create KB server actions (`lib/actions/kb.ts`)
   - Create Jira server actions (`lib/actions/jira.ts`)
   - Implement vector search functionality
   - Add input validation with Zod

### Phase 2: Core KB Features (Week 2)

1. **Backend Implementation**

   - Implement vector embedding generation
   - Build KB CRUD operations with Server Actions
   - Create category management
   - Develop hybrid search (vector + full-text)

2. **Basic UI Components**
   - Create KB entry forms
   - Build entry list and card components
   - Implement basic search interface

### Phase 3: Jira Integration (Week 3)

1. **Jira API Client**

   - Implement Jira API client (`lib/integrations/jira.ts`)
   - Build ticket search and sync functionality
   - Create KB-Jira linking system
   - Add comment functionality

2. **Jira UI Components**
   - Build ticket selector component
   - Create ticket display cards
   - Implement ticket search interface

### Phase 4: Enhanced UI Development (Week 4)

1. **KB Management Interface**

   - Complete KB management pages (`app/kb/`)
   - Implement advanced search with filters
   - Add category management UI
   - Create entry version history viewer

2. **Navigation & Layout**
   - Update sidebar with KB navigation
   - Enhance main layout for dual interface
   - Add breadcrumbs and navigation helpers

### Phase 5: AI Tools & Chat Integration (Week 5)

1. **AI Tools Implementation**

   - Create KB search AI tool
   - Implement KB creation/update tools
   - Build Jira integration tools
   - Update existing chat interface to use new tools

2. **Tool Result Components**
   - Create KB result display components
   - Build Jira ticket display components
   - Implement tool result actions (view, edit, link)

### Phase 6: Polish & Production (Week 6)

1. **Performance & Optimization**

   - Implement caching strategies for vector search
   - Optimize database queries and indexes
   - Add loading states and error handling
   - Implement analytics tracking

2. **Testing & Deployment**
   - Add comprehensive testing
   - Performance testing for vector operations
   - Deploy to Vercel with Postgres integration
   - Monitor and tune vector search performance

**Key Challenges & Considerations:**

- **Vector Search Performance**: Vercel Postgres may have limitations compared to specialized vector databases. Monitor performance and consider implementing caching.
- **Server Actions vs. API Routes**: Some complex operations might benefit from API routes instead of Server Actions.
- **Database Migrations**: Carefully plan the migration from existing schema to new KB schema.
- **pgvector Setup**: Ensure proper indexing and configuration for optimal vector search performance.

## Success Metrics

- Vector search accuracy > 85%
- Average response time < 500ms
- Knowledge base adoption rate
- Reduction in duplicate tickets
- User satisfaction scores
