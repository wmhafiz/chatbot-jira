import { tool } from 'ai';
import { z } from 'zod';
import { createJiraTicketAction } from '@/lib/actions/jira';

export const createJiraTicketTool = tool({
  description: 'Create a Jira ticket for bug reports, feature requests, or other issues based on user conversations. Can automatically link related knowledge base entries.',
  parameters: z.object({
    title: z.string().describe('The title/summary of the Jira ticket'),
    description: z.string().describe('Detailed description of the issue or request'),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium').describe('Priority level of the ticket'),
    issueType: z.enum(['Bug', 'Task', 'Story', 'Epic']).default('Task').describe('Type of Jira ticket'),
    assignee: z.string().optional().describe('Email address of the person to assign the ticket to'),
    projectKey: z.string().optional().describe('Jira project key (e.g., SUPPORT, PROD)'),
    chatId: z.string().optional().describe('ID of the chat conversation this ticket is related to'),
    linkKbEntries: z.boolean().default(true).describe('Whether to automatically find and link related KB entries'),
    labels: z.array(z.string()).optional().describe('Labels to add to the ticket'),
  }),
  execute: async ({ title, description, priority, issueType, assignee, projectKey, chatId, linkKbEntries, labels }) => {
    try {
      const result = await createJiraTicketAction({
        title,
        description,
        issueType,
        priority,
        assignee,
        projectKey,
        chatId,
        linkKbEntries,
        labels,
      });

      if (result.success) {
        const ticket = result.data;
        return {
          success: true,
          message: `Jira ticket created successfully with key ${ticket.issueKey}${ticket.linkedKbEntries ? ` and linked to ${ticket.linkedKbEntries.length} related KB entries` : ''}`,
          ticket: {
            id: ticket.id,
            issueKey: ticket.issueKey,
            title: ticket.title,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            assignee: ticket.assignee,
            reporter: ticket.reporter,
            chatId: ticket.chatId,
            createdAt: ticket.createdAt,
            jiraUrl: ticket.jiraUrl,
          },
          relatedKbEntries: ticket.linkedKbEntries,
        };
      } else {
        return {
          success: false,
          message: result.error || 'Failed to create Jira ticket. Please try again or contact support.',
          ticket: null,
        };
      }
    } catch (error) {
      console.error('Failed to create Jira ticket:', error);
      return {
        success: false,
        message: 'Failed to create Jira ticket. Please try again or contact support.',
        ticket: null,
      };
    }
  },
});