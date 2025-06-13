import 'server-only';

import { embed } from 'ai';
import { myProvider } from './providers';

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: myProvider.textEmbeddingModel('embedding-model'),
      value: text,
    });
    
    return embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function generateEmbeddingForArticle({
  title,
  content,
  summary,
}: {
  title: string;
  content: string;
  summary?: string;
}): Promise<number[]> {
  // Combine title, summary, and content for embedding
  const textToEmbed = [
    title,
    summary || '',
    content,
  ].filter(Boolean).join('\n\n');

  return generateEmbedding(textToEmbed);
}