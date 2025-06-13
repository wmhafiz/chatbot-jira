import { auth } from '@/app/(auth)/auth';
import { getKnowledgeBaseCategories } from '@/lib/db/kb-queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Folder, 
  Save, 
  X,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function CategoriesPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const categories = await getKnowledgeBaseCategories();

  // Mock article counts per category (in a real app, this would be a proper query)
  const categoriesWithCounts = categories.map(category => ({
    ...category,
    articleCount: Math.floor(Math.random() * 20) + 1, // Mock count
  }));

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
          <div>
            <h1 className="text-2xl font-bold">Manage Categories</h1>
            <p className="text-muted-foreground">
              Organize your knowledge base with categories
            </p>
          </div>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoriesWithCounts.map((category) => (
          <Card key={category.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {category.description && (
                <CardDescription className="mt-2">
                  {category.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {category.articleCount} articles
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {new Date(category.createdAt).toLocaleDateString()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Category Card */}
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Add New Category</h3>
              <p className="text-sm text-muted-foreground">
                Create a new category to organize your articles
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Form (would be shown in a modal or separate section) */}
      <Card className="mt-8 hidden" id="category-form">
        <CardHeader>
          <CardTitle>Create New Category</CardTitle>
          <CardDescription>
            Add a new category to help organize your knowledge base articles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name *</Label>
            <Input
              id="category-name"
              placeholder="Enter category name..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              placeholder="Brief description of this category..."
              rows={3}
            />
          </div>
          
          <div className="flex items-center gap-2 pt-4">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Create Category
            </Button>
            <Button variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Active categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoriesWithCounts.reduce((sum, cat) => sum + cat.articleCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Category</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.length > 0 
                ? Math.round(categoriesWithCounts.reduce((sum, cat) => sum + cat.articleCount, 0) / categories.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Articles per category
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <Card className="mt-8">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No categories yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first category to start organizing your knowledge base
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}