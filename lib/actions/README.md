# Knowledge Base Server Actions

This directory contains the server actions for the Knowledge Base system, providing a comprehensive API for managing KB entries, categories, and analytics.

## Overview

The KB server actions are organized into three main modules:

- **`kb.ts`** - Core KB entry operations (CRUD, search)
- **`categories.ts`** - Category management operations
- **`analytics.ts`** - Usage tracking and analytics

## Features

### 🔍 Vector Search

- Hybrid search combining vector similarity and full-text search
- Configurable similarity threshold (default: 0.7)
- Automatic fallback to text search if vector search fails
- Support for filtering by category and tags

### 🛡️ Security & Validation

- Zod schema validation for all inputs
- User authentication and authorization
- Structured error handling with typed responses
- Protection against unauthorized access

### 📊 Analytics & Tracking

- Usage tracking for views, searches, and feedback
- Comprehensive analytics with trends and summaries
- Anonymous tracking support for some actions
- Session-based tracking capabilities

## API Reference

### KB Entry Operations

#### `listKbEntries(params?)`

List KB entries with pagination and filtering.

```typescript
const result = await listKbEntries({
  categoryId: "uuid", // optional
  limit: 50, // default: 50, max: 100
  offset: 0, // default: 0
});
```

#### `getKbEntryById(id)`

Get a single KB entry by ID.

```typescript
const result = await getKbEntryById("entry-uuid");
```

#### `createKbEntry(data)`

Create a new KB entry with automatic embedding generation.

```typescript
const result = await createKbEntry({
  title: "How to Setup Authentication",
  content: "Step-by-step guide...",
  summary: "Authentication setup guide", // optional
  tags: '["auth", "setup"]', // optional JSON string
  categoryId: "category-uuid",
});
```

#### `updateKbEntry(data)`

Update an existing KB entry. Regenerates embeddings if content changes.

```typescript
const result = await updateKbEntry({
  id: "entry-uuid",
  title: "Updated Title", // optional
  content: "Updated content", // optional
  // ... other optional fields
});
```

#### `deleteKbEntry(id)`

Delete a KB entry (soft delete).

```typescript
const result = await deleteKbEntry("entry-uuid");
```

#### `searchKbEntries(params)`

Search KB entries using hybrid vector + text search.

```typescript
const result = await searchKbEntries({
  query: "authentication setup",
  categoryId: "uuid", // optional
  tags: ["auth", "security"], // optional
  limit: 10, // default: 10, max: 50
  similarityThreshold: 0.7, // default: 0.7
  useVector: true, // default: true
});
```

### Category Operations

#### `listCategories()`

List all categories.

```typescript
const result = await listCategories();
```

#### `createCategory(data)`

Create a new category.

```typescript
const result = await createCategory({
  name: "API Documentation",
  description: "API guides and references", // optional
});
```

#### `updateCategory(data)`

Update an existing category.

```typescript
const result = await updateCategory({
  id: "category-uuid",
  name: "Updated Name", // optional
  description: "New description", // optional
});
```

#### `deleteCategory(id)`

Delete a category (only if no articles are assigned).

```typescript
const result = await deleteCategory("category-uuid");
```

#### `getCategoryById(id)`

Get a category by ID.

```typescript
const result = await getCategoryById("category-uuid");
```

### Analytics Operations

#### `trackKbUsage(data)`

Track usage events for analytics.

```typescript
const result = await trackKbUsage({
  articleId: "article-uuid",
  action: "view", // 'view' | 'search' | 'helpful' | 'not_helpful' | 'share'
  metadata: { source: "search" }, // optional
  sessionId: "session-id", // optional
});
```

#### `getKbAnalytics(params?)`

Get comprehensive analytics data.

```typescript
const result = await getKbAnalytics({
  articleId: "uuid", // optional - filter by article
  startDate: new Date(), // optional
  endDate: new Date(), // optional
  action: "view", // optional - filter by action
  limit: 100, // default: 100, max: 1000
});
```

#### `getArticleAnalytics(articleId)`

Get analytics for a specific article.

```typescript
const result = await getArticleAnalytics("article-uuid");
```

## Response Format

All server actions return a consistent response format:

```typescript
type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

### Success Response

```typescript
{
  success: true,
  data: { /* result data */ }
}
```

### Error Response

```typescript
{
  success: false,
  error: "Error message"
}
```

## Error Handling

The actions handle various error scenarios:

- **Validation Errors**: Invalid input data (Zod validation)
- **Authentication Errors**: Unauthorized access
- **Database Errors**: Connection or query failures
- **Not Found Errors**: Requested resources don't exist
- **Business Logic Errors**: Category with articles can't be deleted

## Usage Examples

### Creating and Searching Articles

```typescript
// Create a new article
const createResult = await createKbEntry({
  title: "JWT Authentication Guide",
  content: "This guide explains how to implement JWT authentication...",
  summary: "Complete JWT auth implementation guide",
  tags: '["jwt", "auth", "security", "api"]',
  categoryId: "auth-category-uuid",
});

if (createResult.success) {
  // Track the creation
  await trackKbUsage({
    articleId: createResult.data.id,
    action: "view",
    metadata: { source: "creation" },
  });

  // Search for related articles
  const searchResult = await searchKbEntries({
    query: "JWT authentication",
    categoryId: "auth-category-uuid",
    limit: 5,
  });
}
```

### Analytics Dashboard

```typescript
// Get overall analytics
const analytics = await getKbAnalytics({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  endDate: new Date(),
});

if (analytics.success) {
  const {
    summary, // Overall stats
    topArticles, // Most viewed articles
    usageTrends, // Daily usage trends
    recentActivity, // Recent usage events
  } = analytics.data;
}
```

## Database Schema

The actions work with these database tables:

- **KnowledgeBaseCategory** - Article categories
- **KnowledgeBaseArticle** - KB articles with embeddings
- **KbUsageAnalytics** - Usage tracking and analytics

## Integration

Import actions using the index file:

```typescript
import {
  createKbEntry,
  searchKbEntries,
  trackKbUsage,
  getKbAnalytics,
} from "@/lib/actions";
```

## Performance Considerations

- **Embeddings**: Generated asynchronously, articles created even if embedding fails
- **Vector Search**: Optimized with similarity thresholds and result limits
- **Caching**: Consider implementing Redis caching for frequently accessed data
- **Pagination**: All list operations support pagination to handle large datasets
- **Indexes**: Database indexes are automatically created for optimal query performance

## Migration

A database migration is included to create the analytics table:

```bash
npx drizzle-kit migrate
```

This will create the `KbUsageAnalytics` table for tracking usage events.
