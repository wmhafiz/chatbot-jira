import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createKnowledgeBaseArticle,
  updateKnowledgeBaseArticle,
  deleteKnowledgeBaseArticle,
  getKnowledgeBaseArticles,
} from '@/lib/db/kb-queries';
import { generateEmbeddingForArticle } from '@/lib/ai/embeddings';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const limit = searchParams.get('limit');

    const articles = await getKnowledgeBaseArticles({
      categoryId: categoryId || undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return Response.json(articles);
  } catch (error) {
    console.error('Failed to get articles:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const body = await request.json();
    const { title, content, summary, tags, categoryId } = body;

    if (!title || !content || !categoryId) {
      return new ChatSDKError('bad_request:api').toResponse();
    }

    // Generate embedding for the article
    const embedding = await generateEmbeddingForArticle({
      title,
      content,
      summary,
    });

    const [article] = await createKnowledgeBaseArticle({
      title,
      content,
      summary,
      tags,
      categoryId,
      userId: session.user.id,
      embedding,
    });

    return Response.json(article);
  } catch (error) {
    console.error('Failed to create article:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const body = await request.json();
    const { id, title, content, summary, tags, categoryId } = body;

    if (!id) {
      return new ChatSDKError('bad_request:api').toResponse();
    }

    let embedding;
    if (title || content || summary) {
      // Regenerate embedding if content changed
      embedding = await generateEmbeddingForArticle({
        title: title || '',
        content: content || '',
        summary: summary || '',
      });
    }

    const [article] = await updateKnowledgeBaseArticle({
      id,
      title,
      content,
      summary,
      tags,
      categoryId,
      embedding,
    });

    return Response.json(article);
  } catch (error) {
    console.error('Failed to update article:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new ChatSDKError('bad_request:api').toResponse();
    }

    await deleteKnowledgeBaseArticle({ id });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete article:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}