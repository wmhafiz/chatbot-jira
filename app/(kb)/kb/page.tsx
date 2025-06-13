import { auth } from '@/app/(auth)/auth';
import { getKnowledgeBaseArticles, getKnowledgeBaseCategories } from '@/lib/db/kb-queries';
import { searchKbEntries } from '@/lib/actions/kb';
import { SearchInterface } from '@/components/kb/search-interface';
import { EntryList } from '@/components/kb/entry-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, Search, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

interface SearchParams {
  q?: string;
  category?: string;
  status?: string;
  page?: string;
}

interface KBPageProps {
  searchParams: SearchParams;
}

async function KBContent({ searchParams }: KBPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  const categories = await getKnowledgeBaseCategories();
  const currentPage = parseInt(searchParams.page || '1');
  const pageSize = 20;

  // If there's a search query, perform search
  let articles = [];
  let totalCount = 0;

  if (searchParams.q) {
    const searchResult = await searchKbEntries({
      query: searchParams.q,
      categoryId: searchParams.category,
      limit: pageSize,
      similarityThreshold: 0.7,
      useVector: true,
    });
    
    if (searchResult.success) {
      articles = searchResult.data || [];
      totalCount = articles.length;
    }
  } else {
    // Get regular articles with pagination
    const allArticles = await getKnowledgeBaseArticles({
      categoryId: searchParams.category,
      limit: pageSize,
    });
    articles = allArticles;
    totalCount = allArticles.length;
  }

  const handleSearch = async (filters: any) => {
    'use server';
    const result = await searchKbEntries({
      query: filters.query,
      categoryId: filters.categoryId,
      tags: filters.tags,
      limit: filters.limit || 20,
      similarityThreshold: 0.7,
      useVector: filters.useVector,
    });
    return result.success ? result.data || [] : [];
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Search and browse our comprehensive knowledge base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/kb/new">
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/kb/categories">
              <BookOpen className="h-4 w-4 mr-2" />
              Categories
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              Across {categories.length} categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Organized topics
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {articles.filter(a => {
                const dayAgo = new Date();
                dayAgo.setDate(dayAgo.getDate() - 1);
                return new Date(a.updatedAt) > dayAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Updated today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Interface */}
      <SearchInterface
        categories={categories}
        onSearch={handleSearch}
        initialFilters={{
          query: searchParams.q || '',
          categoryId: searchParams.category,
        }}
      />

      {/* Entry List */}
      {!searchParams.q && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Entries</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {articles.length} entries
              </span>
            </div>
          </div>
          
          <EntryList
            entries={articles}
            categories={categories}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={(page) => {
              // This would be handled by URL navigation in a real implementation
              console.log('Navigate to page:', page);
            }}
            onSearch={(query) => {
              // This would be handled by URL navigation in a real implementation
              console.log('Search:', query);
            }}
            onFilter={(filters) => {
              // This would be handled by URL navigation in a real implementation
              console.log('Filter:', filters);
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {articles.length === 0 && !searchParams.q && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No entries yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first knowledge base entry
              </p>
              <Button asChild>
                <Link href="/kb/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Entry
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Skeleton component for loading state
function EntryListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="h-3 bg-muted rounded w-full mb-2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function KnowledgeBasePage({ searchParams }: KBPageProps) {
  return (
    <Suspense fallback={<EntryListSkeleton />}>
      <KBContent searchParams={searchParams} />
    </Suspense>
  );
}