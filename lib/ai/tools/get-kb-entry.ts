import { tool } from 'ai';
import { z } from 'zod';
import { getKbEntryById } from '@/lib/actions/kb';

export const getKbEntryTool = tool({
  description: 'Retrieve a specific knowledge base entry by its ID. Use this to get detailed information about a particular KB article.',
  parameters: z.object({
    id: z.string().uuid().describe('UUID of the knowledge base entry to retrieve'),
  }),
  execute: async ({ id }) => {
    try {
      const result = await getKbEntryById(id);

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to retrieve knowledge base entry.',
          entry: null,
        };
      }

      const entry = result.data;

      if (!entry) {
        return {
          success: false,
          message: 'Knowledge base entry not found.',
          entry: null,
        };
      }

      return {
        success: true,
        message: `Retrieved knowledge base entry: "${entry.title}"`,
        entry: {
          id: entry.id,
          title: entry.title,
          content: entry.content,
          summary: entry.summary,
          tags: entry.tags ? JSON.parse(entry.tags) : [],
          categoryId: entry.categoryId,
          categoryName: entry.categoryName || 'Uncategorized',
          userId: entry.userId,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          metadata: {
            contentLength: entry.content.length,
            hasEmbedding: !!entry.embedding,
          },
        },
      };
    } catch (error) {
      console.error('Failed to get KB entry:', error);
      return {
        success: false,
        message: 'Failed to retrieve knowledge base entry. Please check the entry ID.',
        entry: null,
      };
    }
  },
});