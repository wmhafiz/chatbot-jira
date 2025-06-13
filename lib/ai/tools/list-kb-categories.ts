import { tool } from 'ai';
import { z } from 'zod';
import { listCategories } from '@/lib/actions/categories';

export const listKbCategoriesTool = tool({
  description: 'List all available knowledge base categories. Use this to show users what categories are available when creating or organizing KB entries.',
  parameters: z.object({
    includeStats: z.boolean().default(false).describe('Whether to include article count statistics for each category'),
  }),
  execute: async ({ includeStats }) => {
    try {
      const result = await listCategories();

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to retrieve knowledge base categories.',
          categories: [],
        };
      }

      const categories = result.data || [];

      if (categories.length === 0) {
        return {
          success: true,
          message: 'No knowledge base categories found. You may need to create categories first.',
          categories: [],
        };
      }

      // Format categories for display
      const formattedCategories = categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description || 'No description provided',
        createdAt: category.createdAt,
      }));

      return {
        success: true,
        message: `Found ${categories.length} knowledge base categories.`,
        categories: formattedCategories,
        totalCount: categories.length,
      };
    } catch (error) {
      console.error('Failed to list KB categories:', error);
      return {
        success: false,
        message: 'Failed to retrieve knowledge base categories. Please try again.',
        categories: [],
      };
    }
  },
});