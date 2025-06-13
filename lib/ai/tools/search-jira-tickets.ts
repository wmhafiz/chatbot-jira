import { tool } from 'ai';
import { z } from 'zod';
import { searchJiraTicketsAction } from '@/lib/actions/jira';

export const searchJiraTicketsTool = tool({
  description: 'Search for Jira tickets using text queries, JQL, or filters. Useful for finding existing tickets related to user issues or questions.',
  parameters: z.object({
    query: z.string().optional().describe('Text search query to find tickets by title, description, or content'),
    jql: z.string().optional().describe('JQL (Jira Query Language) query for advanced searching'),
    status: z.array(z.string()).optional().describe('Filter by ticket status (e.g., ["Open", "In Progress", "Done"])'),
    priority: z.array(z.string()).optional().describe('Filter by priority (e.g., ["High", "Critical"])'),
    assignee: z.string().optional().describe('Filter by assignee email or username'),
    projectKey: z.string().optional().describe('Filter by Jira project key (e.g., "SUPPORT", "PROD")'),
    maxResults: z.number().min(1).max(50).default(10).describe('Maximum number of tickets to return'),
  }),
  execute: async ({ query, jql, status, priority, assignee, projectKey, maxResults }) => {
    try {
      const result = await searchJiraTicketsAction({
        query,
        jql,
        status,
        priority,
        assignee,
        projectKey,
        maxResults,
        startAt: 0,
      });

      if (result.success) {
        const tickets = result.data || [];
        
        return {
          success: true,
          message: `Found ${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} matching your search criteria`,
          tickets: tickets.map((ticket: any) => ({
            id: ticket.id,
            issueKey: ticket.issueKey || ticket.key,
            title: ticket.title || ticket.fields?.summary,
            description: ticket.description || ticket.fields?.description,
            status: ticket.status || ticket.fields?.status?.name,
            priority: ticket.priority || ticket.fields?.priority?.name,
            assignee: ticket.assignee || ticket.fields?.assignee?.emailAddress,
            reporter: ticket.reporter || ticket.fields?.reporter?.emailAddress,
            createdAt: ticket.createdAt || ticket.fields?.created,
            updatedAt: ticket.updatedAt || ticket.fields?.updated,
            projectKey: ticket.fields?.project?.key,
          })),
          totalFound: tickets.length,
        };
      } else {
        return {
          success: false,
          message: result.error || 'Failed to search Jira tickets',
          tickets: [],
          totalFound: 0,
        };
      }
    } catch (error) {
      console.error('Failed to search Jira tickets:', error);
      return {
        success: false,
        message: 'An error occurred while searching Jira tickets. Please try again.',
        tickets: [],
        totalFound: 0,
      };
    }
  },
});