'use server';

import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import {
  createKnowledgeBaseCategory,
  getKnowledgeBaseCategories,
  getKnowledgeBaseCategoryById,
} from '@/lib/db/kb-queries';
import { ChatSDKError } from '@/lib/errors';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { knowledgeBaseCategory, knowledgeBaseArticle } from '@/lib/db/kb-schema';

// Database connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Zod schemas for input validation
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  id: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().optional(),
});

// Response type for consistent error handling
type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function listCategories(): Promise<ActionResponse<any[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const categories = await getKnowledgeBaseCategories();
    return { success: true, data: categories };
  } catch (error) {
    console.error('Error listing categories:', error);
    return { success: false, error: 'Failed to list categories' };
  }
}

export async function createCategory(data: z.infer<typeof createCategorySchema>): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = createCategorySchema.parse(data);
    
    const [category] = await createKnowledgeBaseCategory({
      name: validatedData.name,
      description: validatedData.description,
    });

    return { success: true, data: category };
  } catch (error) {
    console.error('Error creating category:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create category' };
  }
}

export async function updateCategory(data: z.infer<typeof updateCategorySchema>): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = updateCategorySchema.parse(data);
    
    // Check if category exists
    const existingCategory = await getKnowledgeBaseCategoryById({ id: validatedData.id });
    if (!existingCategory) {
      return { success: false, error: 'Category not found' };
    }

    // Build update data
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;

    // If no fields to update, return the existing category
    if (Object.keys(updateData).length === 0) {
      return { success: true, data: existingCategory };
    }

    const [updatedCategory] = await db
      .update(knowledgeBaseCategory)
      .set(updateData)
      .where(eq(knowledgeBaseCategory.id, validatedData.id))
      .returning();

    return { success: true, data: updatedCategory };
  } catch (error) {
    console.error('Error updating category:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update category' };
  }
}

export async function deleteCategory(id: string): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: 'Invalid category ID' };
    }

    // Check if category exists
    const existingCategory = await getKnowledgeBaseCategoryById({ id });
    if (!existingCategory) {
      return { success: false, error: 'Category not found' };
    }

    // Check if category has articles (prevent deletion if it does)
    const articlesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeBaseArticle)
      .where(eq(knowledgeBaseArticle.categoryId, id));

    if (articlesCount[0]?.count > 0) {
      return { 
        success: false, 
        error: 'Cannot delete category that contains articles. Please move or delete the articles first.' 
      };
    }

    const [deletedCategory] = await db
      .delete(knowledgeBaseCategory)
      .where(eq(knowledgeBaseCategory.id, id))
      .returning();

    return { success: true, data: deletedCategory };
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete category' };
  }
}

export async function getCategoryById(id: string): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: 'Invalid category ID' };
    }

    const category = await getKnowledgeBaseCategoryById({ id });
    
    if (!category) {
      return { success: false, error: 'Category not found' };
    }

    return { success: true, data: category };
  } catch (error) {
    console.error('Error getting category:', error);
    return { success: false, error: 'Failed to get category' };
  }
}