# AI Tools for Knowledge Base Integration

This document describes the AI tools implemented for Knowledge Base integration with the chat system.

## Overview

The Knowledge Base (KB) AI tools enable the chat system to interact with the Knowledge Base, allowing users to search, create, update, and manage KB entries through conversational AI.

## Implemented Tools

### 1. Enhanced Search Tool

**File:** `search-knowledge-base.ts`
**Tool Name:** `searchKnowledgeBase`

**Description:** Enhanced version of the existing search tool that now uses the new KB server actions.

**Features:**

- Vector similarity search and text-based search
- Category filtering
- Tag-based filtering
- Configurable similarity thresholds
- Enhanced result formatting with relevance scores

**Parameters:**

- `query` (string): Search query
- `categoryId` (optional string): Filter by category
- `tags` (optional array): Filter by tags
- `useVector` (boolean, default: true): Use vector or text search
- `limit` (number, default: 5): Max results (1-20)
- `similarityThreshold` (number, default: 0.7): Min similarity (0-1)

### 2. Create KB Entry Tool

**File:** `create-kb-entry.ts`
**Tool Name:** `createKbEntryTool`

**Description:** Create new knowledge base entries from chat conversations.

**Features:**

- Auto-generates summaries if not provided
- Supports tags and categorization
- Validates input parameters
- Returns formatted entry details

**Parameters:**

- `title` (string): Entry title (1-255 chars)
- `content` (string): Entry content
- `summary` (optional string): Brief summary
- `tags` (optional string): Comma-separated tags
- `categoryId` (string): Category UUID

### 3. Update KB Entry Tool

**File:** `update-kb-entry.ts`
**Tool Name:** `updateKbEntryTool`

**Description:** Update existing knowledge base entries.

**Features:**

- Partial updates supported
- Validates permissions
- Tracks updated fields
- Auto-regenerates embeddings when content changes

**Parameters:**

- `id` (string): Entry UUID
- `title` (optional string): New title
- `content` (optional string): New content
- `summary` (optional string): New summary
- `tags` (optional string): New tags
- `categoryId` (optional string): New category

### 4. Get KB Entry Tool

**File:** `get-kb-entry.ts`
**Tool Name:** `getKbEntryTool`

**Description:** Retrieve specific knowledge base entries by ID.

**Features:**

- Full entry details including metadata
- Category information
- Content length and embedding status
- Creation and update timestamps

**Parameters:**

- `id` (string): Entry UUID

### 5. Suggest KB Entries Tool

**File:** `suggest-kb-entries.ts`
**Tool Name:** `suggestKbEntriesTool`

**Description:** Suggest related KB entries based on conversation context.

**Features:**

- Semantic similarity search
- Context-aware suggestions
- Exclusion filters
- Relevance scoring and ranking

**Parameters:**

- `context` (string): Conversation context
- `excludeIds` (optional array): IDs to exclude
- `categoryId` (optional string): Focus category
- `maxSuggestions` (number, default: 5): Max suggestions (1-10)
- `similarityThreshold` (number, default: 0.6): Min similarity

### 6. List KB Categories Tool

**File:** `list-kb-categories.ts`
**Tool Name:** `listKbCategoriesTool`

**Description:** List available knowledge base categories.

**Features:**

- Shows all available categories
- Optional statistics
- Formatted for easy selection

**Parameters:**

- `includeStats` (boolean, default: false): Include article counts

### 7. Enhanced Jira Ticket Tool

**File:** `create-jira-ticket.ts` (updated)
**Tool Name:** `createJiraTicketTool`

**Description:** Enhanced Jira ticket creation with KB entry linking.

**Features:**

- Automatic KB entry discovery and linking
- Enhanced descriptions with KB references
- Chat conversation linking
- Relevance scoring for linked entries

**New Parameters:**

- `chatId` (optional string): Related chat ID
- `linkKbEntries` (boolean, default: true): Auto-link KB entries

## Integration Points

### Chat API Route

The tools are registered in `app/(chat)/api/chat/route.ts`:

```typescript
// Tool imports
import { searchKnowledgeBase } from '@/lib/ai/tools/search-knowledge-base';
import { createKbEntryTool } from '@/lib/ai/tools/create-kb-entry';
import { updateKbEntryTool } from '@/lib/ai/tools/update-kb-entry';
import { getKbEntryTool } from '@/lib/ai/tools/get-kb-entry';
import { suggestKbEntriesTool } from '@/lib/ai/tools/suggest-kb-entries';
import { listKbCategoriesTool } from '@/lib/ai/tools/list-kb-categories';

// Active tools array
experimental_activeTools: [
  'searchKnowledgeBase',
  'createKbEntryTool',
  'updateKbEntryTool',
  'getKbEntryTool',
  'suggestKbEntriesTool',
  'listKbCategoriesTool',
  // ... other tools
],

// Tools object
tools: {
  searchKnowledgeBase,
  createKbEntryTool,
  updateKbEntryTool,
  getKbEntryTool,
  suggestKbEntriesTool,
  listKbCategoriesTool,
  // ... other tools
},
```

### System Prompts

Enhanced system prompts in `lib/ai/prompts.ts` include KB-specific guidance:

- Best practices for KB tool usage
- Integration patterns with other tools
- Content organization guidelines

## Usage Patterns

### 1. Question Answering Flow

1. User asks a question
2. AI uses `searchKnowledgeBase` to find relevant articles
3. AI provides answer based on KB content
4. AI may suggest related entries using `suggestKbEntriesTool`

### 2. Knowledge Capture Flow

1. User shares valuable information or solution
2. AI suggests creating a KB entry
3. AI uses `listKbCategoriesTool` to show categories
4. AI uses `createKbEntryTool` to capture the information

### 3. Content Management Flow

1. User wants to update existing content
2. AI uses `getKbEntryTool` to retrieve current content
3. AI uses `updateKbEntryTool` to make changes
4. AI confirms updates and shows changes

### 4. Issue Tracking Integration

1. User reports an issue or requests a feature
2. AI searches KB for related information
3. AI creates Jira ticket with `createJiraTicketTool`
4. Ticket automatically includes links to relevant KB entries

## Error Handling

All tools implement consistent error handling:

- Input validation using Zod schemas
- Authentication checks
- Graceful fallbacks for service failures
- User-friendly error messages
- Detailed logging for debugging

## Performance Considerations

- Vector search optimized for chat responsiveness
- Content truncation for large articles in responses
- Efficient similarity thresholds to balance relevance and performance
- Minimal database queries per tool execution

## Security

- All tools require user authentication
- Permission checks for update/delete operations
- Input sanitization and validation
- Rate limiting through existing chat system limits

## Future Enhancements

Potential improvements for future versions:

- Batch operations for multiple entries
- Advanced analytics and usage tracking
- Content versioning and history
- Automated content suggestions based on chat patterns
- Integration with external knowledge sources
