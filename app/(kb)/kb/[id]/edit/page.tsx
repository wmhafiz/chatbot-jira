import { auth } from '@/app/(auth)/auth';
import { getKnowledgeBaseArticleById, getKnowledgeBaseCategories } from '@/lib/db/kb-queries';
import { updateKbEntry } from '@/lib/actions/kb';
import { EntryForm } from '@/components/kb/entry-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

interface EditKBEntryPageProps {
  params: {
    id: string;
  };
}

export default async function EditKBEntryPage({ params }: EditKBEntryPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const entry = await getKnowledgeBaseArticleById({ id: params.id });
  
  if (!entry) {
    notFound();
  }

  // Check if user owns this entry (in a real app, you might have different permission levels)
  if (entry.userId !== session.user.id) {
    redirect('/kb');
  }

  const rawCategories = await getKnowledgeBaseCategories();
  const categories = rawCategories.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description || undefined,
  }));

  const handleSave = async (data: any) => {
    'use server';
    
    const result = await updateKbEntry({
      id: params.id,
      title: data.title,
      content: data.content,
      summary: data.summary,
      tags: data.tags,
      categoryId: data.categoryId,
    });

    if (result.success && result.data) {
      redirect(`/kb/${result.data.id}`);
    } else {
      throw new Error(result.error || 'Failed to update entry');
    }
  };

  const handleAutoSave = async (data: any) => {
    'use server';
    // Implement auto-save functionality
    try {
      await updateKbEntry({
        id: params.id,
        title: data.title,
        content: data.content,
        summary: data.summary,
        tags: data.tags,
        categoryId: data.categoryId,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleCancel = () => {
    // This would redirect back to view page
    redirect(`/kb/${params.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/kb/${params.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Entry
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Entry</h1>
            <p className="text-muted-foreground">
              Make changes to &ldquo;{entry.title}&rdquo;
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/kb/${params.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Entry
            </Link>
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <EntryForm
          entry={{
            id: entry.id,
            title: entry.title,
            content: entry.content,
            summary: entry.summary || '',
            tags: entry.tags || '',
            categoryId: entry.categoryId,
            status: 'published' as const, // Default status
            severity: 'medium' as const, // Default severity
          }}
          categories={categories}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: EditKBEntryPageProps) {
  const entry = await getKnowledgeBaseArticleById({ id: params.id });
  
  if (!entry) {
    return {
      title: 'Entry Not Found',
    };
  }

  return {
    title: `Edit: ${entry.title} | Knowledge Base`,
    description: `Edit the knowledge base entry: ${entry.title}`,
  };
}