# Jira Integration for Production Support Chatbot

This document describes the comprehensive Jira integration functionality that has been implemented for the Production Support Chatbot.

## Overview

The Jira integration provides seamless connectivity between the Knowledge Base system and Jira, enabling:

- **Ticket Management**: Create, search, and update Jira tickets
- **Knowledge Base Linking**: Automatically link relevant KB entries to tickets
- **AI-Powered Operations**: Use natural language to interact with Jira through the chatbot
- **Real-time Sync**: Keep local ticket data synchronized with Jira

## Features

### 🎫 Ticket Operations

- Create new Jira tickets with full metadata
- Search tickets using text queries or JQL
- Add comments to existing tickets
- Update ticket status, priority, and assignments
- Link tickets to Knowledge Base entries

### 🤖 AI Integration

- Natural language ticket creation
- Automatic KB entry suggestions
- Intelligent ticket search
- Context-aware comment generation

### 🔗 Knowledge Base Integration

- Automatic linking of relevant KB entries to tickets
- Bidirectional relationship tracking
- Similarity-based suggestions
- Visual indicators for linked content

### 📊 Sync & Performance

- Background synchronization with Jira
- Local caching for improved performance
- Rate limiting to respect Jira API limits
- Error handling and retry logic

## Setup Instructions

### 1. Jira Configuration

#### Create API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a descriptive name (e.g., "Production Support Bot")
4. Copy the generated token

#### Service Account (Recommended)

Create a dedicated service account for the bot:

1. Create a new user in your Jira instance
2. Assign appropriate permissions (create/edit tickets, add comments)
3. Use this account's email for authentication

### 2. Environment Variables

Add the following to your `.env` file:

```env
# Jira Integration
JIRA_BASE_URL="https://your-company.atlassian.net"
JIRA_EMAIL="service-account@company.com"
JIRA_API_TOKEN="your-jira-api-token"
JIRA_PROJECT_KEY="SUPPORT"

# Optional: For client-side Jira links
NEXT_PUBLIC_JIRA_BASE_URL="https://your-company.atlassian.net"
```

### 3. Database Migration

Run the database migration to create the required tables:

```bash
npm run db:migrate
```

This creates:

- `KbJiraLink` - Links between KB entries and Jira tickets
- `JiraTicketSync` - Synchronization metadata for tickets

### 4. Permissions

Ensure your Jira service account has:

- **Browse Projects** permission
- **Create Issues** permission
- **Edit Issues** permission
- **Add Comments** permission
- **View Development Tools** (optional, for enhanced features)

## Usage

### AI Chat Commands

The chatbot now understands natural language commands for Jira operations:

#### Creating Tickets

```
"Create a Jira ticket for the login issue we discussed"
"I need to report a bug about the payment system"
"Can you create a high-priority ticket for the server outage?"
```

#### Searching Tickets

```
"Find tickets related to authentication problems"
"Search for open tickets assigned to john@company.com"
"Show me critical priority tickets from last week"
```

#### Adding Comments

```
"Add a comment to ticket SUPPORT-123 with the latest update"
"Update PROD-456 with the resolution steps"
```

### UI Components

#### Ticket Card

Displays ticket information with:

- Issue key and title
- Status and priority badges
- Assignee and reporter info
- Linked KB entries
- Action buttons

#### Ticket Search

Advanced search interface with:

- Text search across title/description
- Status and priority filters
- Assignee filtering
- Project key filtering

#### Create Ticket Form

Comprehensive form for ticket creation:

- Title and description
- Issue type selection
- Priority setting
- Assignee assignment
- Label management
- Automatic KB linking option

#### Ticket Selector

Modal dialog for selecting tickets:

- Search functionality
- Multi-select support
- Visual selection indicators

### Server Actions

#### `searchJiraTicketsAction`

```typescript
const result = await searchJiraTicketsAction({
  query: "authentication error",
  status: ["Open", "In Progress"],
  priority: ["High", "Critical"],
  maxResults: 20,
});
```

#### `createJiraTicketAction`

```typescript
const result = await createJiraTicketAction({
  title: "Login system not working",
  description: "Users cannot log in to the application",
  priority: "High",
  issueType: "Bug",
  linkKbEntries: true,
});
```

#### `addJiraCommentAction`

```typescript
const result = await addJiraCommentAction({
  issueKey: "SUPPORT-123",
  comment: "Issue has been resolved by restarting the service",
});
```

## API Reference

### Jira Client

The `JiraClient` class provides low-level access to Jira API:

```typescript
import { jiraClient } from "@/lib/integrations/jira";

// Search issues
const issues = await jiraClient.searchIssues({
  jql: 'project = SUPPORT AND status = "Open"',
  maxResults: 50,
});

// Create issue
const newIssue = await jiraClient.createIssue({
  summary: "Bug report",
  description: "Detailed description",
  issueType: "Bug",
  priority: "High",
});

// Add comment
const comment = await jiraClient.addComment("SUPPORT-123", "This is a comment");
```

### Database Queries

#### KB-Jira Links

```typescript
// Create link
await createKbJiraLink({
  kbArticleId: "kb-uuid",
  jiraTicketId: "ticket-uuid",
  linkType: "related",
  createdBy: "user-uuid",
});

// Get links
const links = await getKbJiraLinks({
  kbArticleId: "kb-uuid",
});
```

#### Ticket Sync

```typescript
// Create sync record
await createJiraTicketSync({
  ticketId: "ticket-uuid",
  syncStatus: "success",
  jiraUpdatedAt: new Date(),
});
```

## Configuration Options

### Rate Limiting

The Jira client includes built-in rate limiting:

- 10 requests per second (Jira Cloud limit)
- Automatic retry with backoff
- Configurable in `JiraClient` constructor

### Sync Frequency

Background sync can be configured:

- Default: Every 5 minutes for active tickets
- Configurable via `getTicketsNeedingSync` parameters

### Error Handling

Comprehensive error handling includes:

- API authentication errors
- Network timeouts
- Rate limit exceeded
- Invalid JQL queries
- Permission errors

## Troubleshooting

### Common Issues

#### Authentication Errors

```
Error: Jira API error (401): Unauthorized
```

**Solution**: Verify JIRA_EMAIL and JIRA_API_TOKEN are correct

#### Permission Errors

```
Error: Jira API error (403): Forbidden
```

**Solution**: Check service account permissions in Jira

#### Rate Limiting

```
Error: Jira API error (429): Too Many Requests
```

**Solution**: The client handles this automatically with backoff

#### Invalid JQL

```
Error: Invalid JQL query
```

**Solution**: Validate JQL syntax in Jira's issue search

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=jira:*
```

### Health Check

Test your Jira connection:

```typescript
const { valid, error } = await jiraClient.validateConnection();
if (!valid) {
  console.error("Jira connection failed:", error);
}
```

## Security Considerations

### API Token Security

- Store API tokens securely in environment variables
- Use service accounts with minimal required permissions
- Rotate tokens regularly
- Never commit tokens to version control

### Data Privacy

- Ticket data is cached locally for performance
- Sensitive information should use Jira's visibility controls
- Consider data retention policies for local cache

### Access Control

- Server actions include authentication checks
- User permissions are validated before operations
- Audit trails are maintained for ticket operations

## Performance Optimization

### Caching Strategy

- Frequently accessed tickets are cached locally
- Cache invalidation on ticket updates
- Background sync for data freshness

### Query Optimization

- Indexed database fields for fast searches
- Pagination for large result sets
- Efficient JQL queries

### Rate Limit Management

- Built-in rate limiting respects Jira limits
- Request queuing during high traffic
- Exponential backoff for retries

## Monitoring and Analytics

### Metrics to Track

- Ticket creation rate
- Search query performance
- Sync success/failure rates
- API response times
- User engagement with Jira features

### Error Monitoring

- Failed API requests
- Sync errors
- Authentication failures
- Rate limit hits

## Future Enhancements

### Planned Features

- Webhook support for real-time updates
- Advanced JQL query builder UI
- Bulk ticket operations
- Custom field support
- Attachment handling
- Workflow automation

### Integration Opportunities

- Slack notifications for ticket updates
- Email integration for ticket creation
- Calendar integration for due dates
- Dashboard for ticket analytics

## Support

For issues with the Jira integration:

1. Check the troubleshooting section above
2. Verify environment variables are set correctly
3. Test Jira connectivity using the health check
4. Review server logs for detailed error messages
5. Consult Jira API documentation for specific errors

## Contributing

When contributing to the Jira integration:

1. Follow existing code patterns
2. Add comprehensive error handling
3. Include unit tests for new features
4. Update documentation for API changes
5. Test with different Jira configurations
