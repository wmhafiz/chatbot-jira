import { tool } from 'ai';
import { z } from 'zod';
import { addJiraCommentAction } from '@/lib/actions/jira';

export const addJiraCommentTool = tool({
  description: 'Add a comment to an existing Jira ticket. Useful for providing updates, additional information, or responses to user questions about a ticket.',
  parameters: z.object({
    issueKey: z.string().describe('The Jira issue key (e.g., "SUPPORT-123", "PROD-456")'),
    comment: z.string().describe('The comment text to add to the ticket'),
    visibility: z.object({
      type: z.enum(['group', 'role']).describe('Type of visibility restriction'),
      value: z.string().describe('The group or role name that can see this comment'),
    }).optional().describe('Optional visibility restriction for the comment'),
  }),
  execute: async ({ issueKey, comment, visibility }) => {
    try {
      const result = await addJiraCommentAction({
        issueKey,
        comment,
        visibility,
      });

      if (result.success) {
        const commentData = result.data;
        
        return {
          success: true,
          message: `Comment added successfully to ticket ${issueKey}`,
          comment: {
            id: commentData.id,
            body: commentData.body,
            author: commentData.author?.displayName || 'Unknown',
            created: commentData.created,
            updated: commentData.updated,
            issueKey,
          },
        };
      } else {
        return {
          success: false,
          message: result.error || `Failed to add comment to ticket ${issueKey}`,
          comment: null,
        };
      }
    } catch (error) {
      console.error('Failed to add Jira comment:', error);
      return {
        success: false,
        message: `An error occurred while adding comment to ticket ${issueKey}. Please try again.`,
        comment: null,
      };
    }
  },
});