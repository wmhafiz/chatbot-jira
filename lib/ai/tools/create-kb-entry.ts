import { tool } from 'ai';
import { z } from 'zod';
import { createKbEntry } from '@/lib/actions/kb';

export const createKbEntryTool = tool({
  description: 'Create a new knowledge base entry from chat conversations. Use this to capture important information, solutions, or insights that should be preserved in the knowledge base.',
  parameters: z.object({
    title: z.string().min(1).max(255).describe('Clear, descriptive title for the knowledge base entry'),
    content: z.string().min(1).describe('Detailed content of the knowledge base entry. Include all relevant information, steps, or explanations.'),
    summary: z.string().optional().describe('Optional brief summary of the entry. If not provided, one will be auto-generated.'),
    tags: z.string().optional().describe('Optional comma-separated tags to help categorize and find this entry (e.g., "troubleshooting,api,authentication")'),
    categoryId: z.string().uuid().describe('UUID of the category this entry belongs to. Use appropriate category based on the content type.'),
  }),
  execute: async ({ title, content, summary, tags, categoryId }) => {
    try {
      // Auto-generate summary if not provided
      const finalSummary = summary || (content.length > 200 
        ? content.substring(0, 200).trim() + '...'
        : content.substring(0, 100).trim() + '...');

      const result = await createKbEntry({
        title,
        content,
        summary: finalSummary,
        tags,
        categoryId,
      });

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to create knowledge base entry.',
          entry: null,
        };
      }

      const entry = result.data;

      return {
        success: true,
        message: `Knowledge base entry "${title}" created successfully.`,
        entry: {
          id: entry.id,
          title: entry.title,
          summary: entry.summary,
          content: entry.content.length > 200 
            ? entry.content.substring(0, 200) + '...' 
            : entry.content,
          tags: entry.tags ? JSON.parse(entry.tags) : [],
          categoryId: entry.categoryId,
          createdAt: entry.createdAt,
        },
      };
    } catch (error) {
      console.error('Failed to create KB entry:', error);
      return {
        success: false,
        message: 'Failed to create knowledge base entry. Please check the category ID and try again.',
        entry: null,
      };
    }
  },
});