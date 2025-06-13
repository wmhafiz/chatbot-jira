import { auth } from '@/app/(auth)/auth';
import { getKnowledgeBaseArticleById, getKnowledgeBaseArticles } from '@/lib/db/kb-queries';
import { EntryViewer } from '@/components/kb/entry-viewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Share, Copy } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

interface KBEntryPageProps {
  params: {
    id: string;
  };
}

export default async function KBEntryPage({ params }: KBEntryPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const entry = await getKnowledgeBaseArticleById({ id: params.id });
  
  if (!entry) {
    notFound();
  }

  // Get related entries (simplified - in a real app, this would use vector similarity)
  const allEntries = await getKnowledgeBaseArticles({ 
    categoryId: entry.categoryId,
    limit: 5 
  });
  
  const relatedEntries = allEntries
    .filter(e => e.id !== entry.id)
    .slice(0, 3)
    .map(e => ({
      id: e.id,
      title: e.title,
      categoryName: e.categoryName || undefined,
      similarity: Math.random() * 0.3 + 0.7, // Mock similarity score
    }));

  const handleRate = async (id: string, rating: 'up' | 'down') => {
    'use server';
    // Implement rating functionality
    console.log('Rating:', id, rating);
  };

  const handleShare = async (id: string) => {
    'use server';
    // Implement sharing functionality
    console.log('Sharing:', id);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/kb">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to KB
            </Link>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/kb/${entry.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Entry Content */}
      <div className="max-w-4xl mx-auto">
        <EntryViewer
          entry={{
            ...entry,
            categoryName: entry.categoryName || undefined,
            status: 'published' as const,
            severity: 'medium' as const,
            viewCount: Math.floor(Math.random() * 100) + 10, // Mock view count
          }}
          relatedEntries={relatedEntries}
          onRate={handleRate}
          onShare={handleShare}
          onEdit={(id) => {
            // This would navigate to edit page
            console.log('Edit:', id);
          }}
        />
      </div>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: KBEntryPageProps) {
  const entry = await getKnowledgeBaseArticleById({ id: params.id });
  
  if (!entry) {
    return {
      title: 'Entry Not Found',
    };
  }

  return {
    title: `${entry.title} | Knowledge Base`,
    description: entry.summary || entry.content.substring(0, 160),
    openGraph: {
      title: entry.title,
      description: entry.summary || entry.content.substring(0, 160),
      type: 'article',
    },
  };
}