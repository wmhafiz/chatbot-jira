'use server';

import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import {
  createKnowledgeBaseArticle,
  updateKnowledgeBaseArticle,
  getKnowledgeBaseArticles,
  getKnowledgeBaseArticleById,
  deleteKnowledgeBaseArticle,
  searchKnowledgeBaseArticles,
  searchKnowledgeBaseByVector,
} from '@/lib/db/kb-queries';
import { generateEmbeddingForArticle } from '@/lib/ai/embeddings';
import { ChatSDKError } from '@/lib/errors';

// Zod schemas for input validation
const createKbEntrySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().optional(),
  tags: z.string().optional(),
  categoryId: z.string().uuid('Invalid category ID'),
});

const updateKbEntrySchema = z.object({
  id: z.string().uuid('Invalid entry ID'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  summary: z.string().optional(),
  tags: z.string().optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
});

const listKbEntriesSchema = z.object({
  categoryId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const searchKbEntriesSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(50).default(10),
  similarityThreshold: z.number().min(0).max(1).default(0.7),
  useVector: z.boolean().default(true),
});

// Response type for consistent error handling
type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function listKbEntries(params: Partial<z.infer<typeof listKbEntriesSchema>> = {}): Promise<ActionResponse<any[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedParams = listKbEntriesSchema.parse(params);
    
    const articles = await getKnowledgeBaseArticles({
      categoryId: validatedParams.categoryId,
      limit: validatedParams.limit,
    });

    return { success: true, data: articles };
  } catch (error) {
    console.error('Error listing KB entries:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    return { success: false, error: 'Failed to list knowledge base entries' };
  }
}

export async function getKbEntryById(id: string): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: 'Invalid entry ID' };
    }

    const article = await getKnowledgeBaseArticleById({ id });
    
    if (!article) {
      return { success: false, error: 'Knowledge base entry not found' };
    }

    return { success: true, data: article };
  } catch (error) {
    console.error('Error getting KB entry:', error);
    return { success: false, error: 'Failed to get knowledge base entry' };
  }
}

export async function createKbEntry(data: z.infer<typeof createKbEntrySchema>): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = createKbEntrySchema.parse(data);
    
    // Generate embedding for the article
    let embedding: number[] | undefined;
    try {
      embedding = await generateEmbeddingForArticle({
        title: validatedData.title,
        content: validatedData.content,
        summary: validatedData.summary,
      });
    } catch (embeddingError) {
      console.warn('Failed to generate embedding, creating article without embedding:', embeddingError);
    }

    const [article] = await createKnowledgeBaseArticle({
      title: validatedData.title,
      content: validatedData.content,
      summary: validatedData.summary,
      tags: validatedData.tags,
      categoryId: validatedData.categoryId,
      userId: session.user.id,
      embedding,
    });

    return { success: true, data: article };
  } catch (error) {
    console.error('Error creating KB entry:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create knowledge base entry' };
  }
}

export async function updateKbEntry(data: z.infer<typeof updateKbEntrySchema>): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = updateKbEntrySchema.parse(data);
    
    // Check if the entry exists and belongs to the user
    const existingArticle = await getKnowledgeBaseArticleById({ id: validatedData.id });
    if (!existingArticle) {
      return { success: false, error: 'Knowledge base entry not found' };
    }
    
    if (existingArticle.userId !== session.user.id) {
      return { success: false, error: 'Unauthorized to update this entry' };
    }

    // Generate new embedding if content-related fields are being updated
    let embedding: number[] | undefined;
    if (validatedData.title || validatedData.content || validatedData.summary) {
      try {
        embedding = await generateEmbeddingForArticle({
          title: validatedData.title || existingArticle.title,
          content: validatedData.content || existingArticle.content,
          summary: validatedData.summary !== undefined ? validatedData.summary : (existingArticle.summary || undefined),
        });
      } catch (embeddingError) {
        console.warn('Failed to generate embedding for update:', embeddingError);
      }
    }

    const [updatedArticle] = await updateKnowledgeBaseArticle({
      id: validatedData.id,
      title: validatedData.title,
      content: validatedData.content,
      summary: validatedData.summary,
      tags: validatedData.tags,
      categoryId: validatedData.categoryId,
      embedding,
    });

    return { success: true, data: updatedArticle };
  } catch (error) {
    console.error('Error updating KB entry:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update knowledge base entry' };
  }
}

export async function deleteKbEntry(id: string): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: 'Invalid entry ID' };
    }

    // Check if the entry exists and belongs to the user
    const existingArticle = await getKnowledgeBaseArticleById({ id });
    if (!existingArticle) {
      return { success: false, error: 'Knowledge base entry not found' };
    }
    
    if (existingArticle.userId !== session.user.id) {
      return { success: false, error: 'Unauthorized to delete this entry' };
    }

    const [deletedArticle] = await deleteKnowledgeBaseArticle({ id });

    return { success: true, data: deletedArticle };
  } catch (error) {
    console.error('Error deleting KB entry:', error);
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete knowledge base entry' };
  }
}

export async function searchKbEntries(params: z.infer<typeof searchKbEntriesSchema>): Promise<ActionResponse<any[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedParams = searchKbEntriesSchema.parse(params);
    
    let results: any[] = [];

    if (validatedParams.useVector) {
      try {
        // Generate embedding for the search query
        const queryEmbedding = await generateEmbeddingForArticle({
          title: validatedParams.query,
          content: validatedParams.query,
        });

        // Perform vector similarity search
        const vectorResults = await searchKnowledgeBaseByVector({
          embedding: queryEmbedding,
          limit: validatedParams.limit,
        });

        // Filter by similarity threshold
        results = vectorResults.filter(
          (result: any) => result.similarity >= validatedParams.similarityThreshold
        );

        // If vector search doesn't return enough results, fall back to text search
        if (results.length < validatedParams.limit / 2) {
          const textResults = await searchKnowledgeBaseArticles({
            query: validatedParams.query,
            limit: validatedParams.limit - results.length,
          });

          // Merge results, avoiding duplicates
          const existingIds = new Set(results.map((r: any) => r.id));
          const newResults = textResults.filter((r: any) => !existingIds.has(r.id));
          results = [...results, ...newResults];
        }
      } catch (embeddingError) {
        console.warn('Vector search failed, falling back to text search:', embeddingError);
        // Fall back to text search
        results = await searchKnowledgeBaseArticles({
          query: validatedParams.query,
          limit: validatedParams.limit,
        });
      }
    } else {
      // Use text-based search only
      results = await searchKnowledgeBaseArticles({
        query: validatedParams.query,
        limit: validatedParams.limit,
      });
    }

    // Apply additional filters
    if (validatedParams.categoryId) {
      results = results.filter((r: any) => r.categoryId === validatedParams.categoryId);
    }

    if (validatedParams.tags && validatedParams.tags.length > 0) {
      results = results.filter((r: any) => {
        if (!r.tags) return false;
        try {
          const articleTags = JSON.parse(r.tags);
          return validatedParams.tags!.some(tag => articleTags.includes(tag));
        } catch {
          return false;
        }
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Error searching KB entries:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    return { success: false, error: 'Failed to search knowledge base entries' };
  }
}