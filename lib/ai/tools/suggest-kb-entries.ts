import { tool } from 'ai';
import { z } from 'zod';
import { searchKbEntries } from '@/lib/actions/kb';

export const suggestKbEntriesTool = tool({
  description: 'Suggest related knowledge base entries based on conversation context. Use this to find relevant KB articles that might help with the current discussion.',
  parameters: z.object({
    context: z.string().describe('The conversation context or topic to find related KB entries for'),
    excludeIds: z.array(z.string().uuid()).optional().describe('Optional array of KB entry IDs to exclude from suggestions'),
    categoryId: z.string().uuid().optional().describe('Optional category ID to focus suggestions on a specific category'),
    maxSuggestions: z.number().min(1).max(10).default(5).describe('Maximum number of suggestions to return (1-10)'),
    similarityThreshold: z.number().min(0).max(1).default(0.6).describe('Minimum similarity threshold for suggestions (0-1, lower = more suggestions)'),
  }),
  execute: async ({ context, excludeIds = [], categoryId, maxSuggestions, similarityThreshold }) => {
    try {
      // Use vector search to find semantically similar entries
      const result = await searchKbEntries({
        query: context,
        categoryId,
        useVector: true,
        limit: maxSuggestions + excludeIds.length, // Get extra to account for exclusions
        similarityThreshold,
      });

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to find related knowledge base entries.',
          suggestions: [],
        };
      }

      let entries = result.data || [];

      // Filter out excluded entries
      if (excludeIds.length > 0) {
        entries = entries.filter(entry => !excludeIds.includes(entry.id));
      }

      // Limit to requested number of suggestions
      entries = entries.slice(0, maxSuggestions);

      if (entries.length === 0) {
        return {
          success: true,
          message: 'No related knowledge base entries found for the current context.',
          suggestions: [],
        };
      }

      // Format suggestions with relevance information
      const suggestions = entries.map((entry, index) => ({
        id: entry.id,
        title: entry.title,
        summary: entry.summary || entry.content.substring(0, 150) + '...',
        category: entry.categoryName || 'Uncategorized',
        categoryId: entry.categoryId,
        tags: entry.tags ? JSON.parse(entry.tags) : [],
        relevanceScore: 'similarity' in entry ? Math.round(entry.similarity * 100) / 100 : undefined,
        rank: index + 1,
        createdAt: entry.createdAt,
      }));

      return {
        success: true,
        message: `Found ${suggestions.length} related knowledge base entries.`,
        suggestions,
        context: context.substring(0, 100) + (context.length > 100 ? '...' : ''),
        searchCriteria: {
          categoryId,
          similarityThreshold,
          excludedCount: excludeIds.length,
        },
      };
    } catch (error) {
      console.error('Failed to suggest KB entries:', error);
      return {
        success: false,
        message: 'Failed to find related knowledge base entries. Please try again.',
        suggestions: [],
      };
    }
  },
});