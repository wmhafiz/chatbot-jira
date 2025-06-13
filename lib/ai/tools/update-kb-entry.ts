import { tool } from 'ai';
import { z } from 'zod';
import { updateKbEntry } from '@/lib/actions/kb';

export const updateKbEntryTool = tool({
  description: 'Update an existing knowledge base entry. Use this to modify, improve, or add information to existing KB articles.',
  parameters: z.object({
    id: z.string().uuid().describe('UUID of the knowledge base entry to update'),
    title: z.string().min(1).max(255).optional().describe('New title for the entry (optional)'),
    content: z.string().min(1).optional().describe('New content for the entry (optional)'),
    summary: z.string().optional().describe('New summary for the entry (optional)'),
    tags: z.string().optional().describe('New comma-separated tags for the entry (optional)'),
    categoryId: z.string().uuid().optional().describe('New category ID for the entry (optional)'),
  }),
  execute: async ({ id, title, content, summary, tags, categoryId }) => {
    try {
      // Ensure at least one field is being updated
      if (!title && !content && !summary && !tags && !categoryId) {
        return {
          success: false,
          message: 'At least one field must be provided to update the knowledge base entry.',
          entry: null,
        };
      }

      const updateData: any = { id };
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (summary !== undefined) updateData.summary = summary;
      if (tags !== undefined) updateData.tags = tags;
      if (categoryId !== undefined) updateData.categoryId = categoryId;

      const result = await updateKbEntry(updateData);

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to update knowledge base entry.',
          entry: null,
        };
      }

      const entry = result.data;

      return {
        success: true,
        message: `Knowledge base entry "${entry.title}" updated successfully.`,
        entry: {
          id: entry.id,
          title: entry.title,
          summary: entry.summary,
          content: entry.content.length > 200 
            ? entry.content.substring(0, 200) + '...' 
            : entry.content,
          tags: entry.tags ? JSON.parse(entry.tags) : [],
          categoryId: entry.categoryId,
          updatedAt: entry.updatedAt,
        },
        updatedFields: Object.keys(updateData).filter(key => key !== 'id'),
      };
    } catch (error) {
      console.error('Failed to update KB entry:', error);
      return {
        success: false,
        message: 'Failed to update knowledge base entry. Please check the entry ID and permissions.',
        entry: null,
      };
    }
  },
});