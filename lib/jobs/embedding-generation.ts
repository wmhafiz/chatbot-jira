import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, isNull } from 'drizzle-orm';
import { knowledgeBaseArticle } from '../db/kb-schema';
import { cache } from '../cache/manager';
import { generateEmbedding } from '../ai/embeddings';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface EmbeddingGenerationJobData {
  articleId?: string; // Generate embedding for specific article
  batchSize?: number; // Batch process articles without embeddings
  forceRegenerate?: boolean; // Regenerate even if embedding exists
}

export class EmbeddingGenerationJob {
  static async process(data: EmbeddingGenerationJobData): Promise<void> {
    console.log('Processing embedding generation job:', data);

    try {
      if (data.articleId) {
        await this.generateSingleEmbedding(data.articleId, data.forceRegenerate);
      } else {
        await this.generateBatchEmbeddings(data.batchSize || 10);
      }

      console.log('Embedding generation job completed successfully');
    } catch (error) {
      console.error('Embedding generation job failed:', error);
      throw error;
    }
  }

  private static async generateSingleEmbedding(articleId: string, forceRegenerate = false): Promise<void> {
    try {
      const article = await db
        .select()
        .from(knowledgeBaseArticle)
        .where(eq(knowledgeBaseArticle.id, articleId))
        .limit(1);

      if (article.length === 0) {
        throw new Error(`Article not found: ${articleId}`);
      }

      const articleData = article[0];

      // Skip if embedding exists and not forcing regeneration
      if (articleData.embedding && !forceRegenerate) {
        console.log(`Embedding already exists for article ${articleId}, skipping`);
        return;
      }

      console.log(`Generating embedding for article: ${articleData.title}`);

      // Combine title and content for embedding
      const textToEmbed = `${articleData.title}\n\n${articleData.content}`;
      
      // Use cache to avoid regenerating the same embedding
      const embedding = await cache.cacheEmbedding(textToEmbed, async () => {
        return await generateEmbedding(textToEmbed);
      });

      // Update article with embedding
      await db
        .update(knowledgeBaseArticle)
        .set({
          embedding: embedding as any, // Type assertion for vector type
          updatedAt: new Date()
        })
        .where(eq(knowledgeBaseArticle.id, articleId));

      // Invalidate cache for this article
      await cache.del(`kb_entry:${articleId}`);

      console.log(`Successfully generated embedding for article: ${articleData.title}`);
    } catch (error) {
      console.error(`Failed to generate embedding for article ${articleId}:`, error);
      throw error;
    }
  }

  private static async generateBatchEmbeddings(batchSize: number): Promise<void> {
    try {
      // Get articles without embeddings
      const articlesWithoutEmbeddings = await db
        .select({
          id: knowledgeBaseArticle.id,
          title: knowledgeBaseArticle.title,
          content: knowledgeBaseArticle.content
        })
        .from(knowledgeBaseArticle)
        .where(isNull(knowledgeBaseArticle.embedding))
        .limit(batchSize);

      if (articlesWithoutEmbeddings.length === 0) {
        console.log('No articles found without embeddings');
        return;
      }

      console.log(`Processing ${articlesWithoutEmbeddings.length} articles for embedding generation`);

      // Process articles in parallel with rate limiting
      const promises = articlesWithoutEmbeddings.map(async (article, index) => {
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        try {
          const textToEmbed = `${article.title}\n\n${article.content}`;
          
          const embedding = await cache.cacheEmbedding(textToEmbed, async () => {
            return await generateEmbedding(textToEmbed);
          });

          await db
            .update(knowledgeBaseArticle)
            .set({
              embedding: embedding as any,
              updatedAt: new Date()
            })
            .where(eq(knowledgeBaseArticle.id, article.id));

          // Invalidate cache
          await cache.del(`kb_entry:${article.id}`);

          console.log(`Generated embedding for: ${article.title}`);
        } catch (error) {
          console.error(`Failed to generate embedding for article ${article.id}:`, error);
          // Don't throw here to allow other articles to continue processing
        }
      });

      await Promise.all(promises);

      console.log(`Batch embedding generation completed for ${articlesWithoutEmbeddings.length} articles`);
    } catch (error) {
      console.error('Failed to process batch embeddings:', error);
      throw error;
    }
  }

  static async scheduleEmbeddingGeneration(data: EmbeddingGenerationJobData): Promise<string> {
    const { jobQueue } = await import('./queue');
    return jobQueue.addJob('embedding_generation', data, {
      priority: 3,
      maxAttempts: 2
    });
  }

  static async schedulePeriodicEmbeddingGeneration(): Promise<void> {
    const { jobQueue } = await import('./queue');
    
    // Schedule batch embedding generation every 30 minutes
    await jobQueue.addJob('embedding_generation', { batchSize: 20 }, {
      priority: 3,
      delay: 30 * 60 * 1000, // 30 minutes
      maxAttempts: 2
    });
  }

  static async scheduleEmbeddingForArticle(articleId: string, forceRegenerate = false): Promise<string> {
    return this.scheduleEmbeddingGeneration({
      articleId,
      forceRegenerate
    });
  }

  static async regenerateAllEmbeddings(): Promise<string> {
    const { jobQueue } = await import('./queue');
    
    // Get total count of articles
    const totalArticles = await db
      .select({ count: knowledgeBaseArticle.id })
      .from(knowledgeBaseArticle);

    const batchSize = 50;
    const totalBatches = Math.ceil(totalArticles.length / batchSize);

    console.log(`Scheduling ${totalBatches} batches for embedding regeneration`);

    // Schedule multiple batch jobs
    for (let i = 0; i < totalBatches; i++) {
      await jobQueue.addJob('embedding_generation', {
        batchSize,
        forceRegenerate: true
      }, {
        priority: 2,
        delay: i * 5000, // 5 second delay between batches
        maxAttempts: 2
      });
    }

    return `Scheduled ${totalBatches} embedding regeneration batches`;
  }
}