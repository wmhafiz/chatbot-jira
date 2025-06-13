import { auth } from '@/app/(auth)/auth';
import { getKnowledgeBaseCategories } from '@/lib/db/kb-queries';
import { createKbEntry } from '@/lib/actions/kb';
import { EntryForm } from '@/components/kb/entry-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NewKBEntryPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const rawCategories = await getKnowledgeBaseCategories();
  const categories = rawCategories.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description || undefined,
  }));

  const handleSave = async (data: any) => {
    'use server';
    
    const result = await createKbEntry({
      title: data.title,
      content: data.content,
      summary: data.summary,
      tags: data.tags,
      categoryId: data.categoryId,
    });

    if (result.success && result.data) {
      redirect(`/kb/${result.data.id}`);
    } else {
      throw new Error(result.error || 'Failed to create entry');
    }
  };

  const handleAutoSave = async (data: any) => {
    'use server';
    // Implement auto-save functionality if needed
    console.log('Auto-saving:', data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="sm" asChild>
          <Link href="/kb">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to KB
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Entry</h1>
          <p className="text-muted-foreground">
            Add a new article to the knowledge base
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <EntryForm
          categories={categories}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          onCancel={() => {
            // This would redirect back to KB in a real implementation
            console.log('Cancel creation');
          }}
        />
      </div>
    </div>
  );
}