import { tool } from 'ai';
import { z } from 'zod';
import { searchKbEntries } from '@/lib/actions/kb';

export const searchKnowledgeBase = tool({
  description: 'Search the knowledge base for relevant articles and information to help answer user questions. Supports both vector similarity search and text-based search with category filtering.',
  parameters: z.object({
    query: z.string().describe('The search query or question to find relevant knowledge base articles'),
    categoryId: z.string().uuid().optional().describe('Optional category ID to filter results by specific category'),
    tags: z.array(z.string()).optional().describe('Optional array of tags to filter results'),
    useVector: z.boolean().default(true).describe('Whether to use vector similarity search (true) or text search (false)'),
    limit: z.number().min(1).max(20).default(5).describe('Maximum number of articles to return (1-20)'),
    similarityThreshold: z.number().min(0).max(1).default(0.7).describe('Minimum similarity threshold for vector search results (0-1)'),
  }),
  execute: async ({ query, categoryId, tags, useVector, limit, similarityThreshold }) => {
    try {
      const result = await searchKbEntries({
        query,
        categoryId,
        tags,
        useVector,
        limit,
        similarityThreshold,
      });

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to search the knowledge base.',
          articles: [],
        };
      }

      const articles = result.data || [];

      if (articles.length === 0) {
        return {
          success: true,
          message: 'No relevant articles found in the knowledge base.',
          articles: [],
          searchType: useVector ? 'vector' : 'text',
        };
      }

      // Format results for the AI with enhanced information
      const formattedResults = articles.map((article) => ({
        id: article.id,
        title: article.title,
        summary: article.summary || article.content.substring(0, 200) + '...',
        content: article.content.length > 1000
          ? article.content.substring(0, 1000) + '...'
          : article.content,
        category: article.categoryName || 'Uncategorized',
        categoryId: article.categoryId,
        tags: article.tags ? JSON.parse(article.tags) : [],
        similarity: 'similarity' in article ? Math.round(article.similarity * 100) / 100 : undefined,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      }));

      return {
        success: true,
        message: `Found ${articles.length} relevant article(s) in the knowledge base.`,
        articles: formattedResults,
        searchType: useVector ? 'vector' : 'text',
        totalResults: articles.length,
      };
    } catch (error) {
      console.error('Knowledge base search error:', error);
      return {
        success: false,
        message: 'Failed to search the knowledge base. Please try again.',
        articles: [],
      };
    }
  },
});