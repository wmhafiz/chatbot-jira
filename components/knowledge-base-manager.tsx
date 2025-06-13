'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from './ui/badge';
import { Search, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import type { KnowledgeBaseArticle, KnowledgeBaseCategory } from '@/lib/db/kb-schema';

interface ArticleWithCategory {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string | null;
  categoryId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  categoryName?: string | null;
}

interface KnowledgeBaseManagerProps {
  initialArticles: ArticleWithCategory[];
  categories: KnowledgeBaseCategory[];
  userId: string;
}

interface ArticleFormData {
  title: string;
  content: string;
  summary: string;
  tags: string;
  categoryId: string;
}

export function KnowledgeBaseManager({ 
  initialArticles, 
  categories, 
  userId 
}: KnowledgeBaseManagerProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    content: '',
    summary: '',
    tags: '',
    categoryId: '',
  });

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateArticle = () => {
    setIsCreating(true);
    setFormData({
      title: '',
      content: '',
      summary: '',
      tags: '',
      categoryId: categories[0]?.id || '',
    });
  };

  const handleEditArticle = (article: ArticleWithCategory) => {
    setEditingId(article.id);
    setFormData({
      title: article.title,
      content: article.content,
      summary: article.summary || '',
      tags: article.tags || '',
      categoryId: article.categoryId,
    });
  };

  const handleSaveArticle = async () => {
    try {
      const response = await fetch('/api/kb/articles', {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: editingId,
          userId,
        }),
      });

      if (response.ok) {
        const savedArticle = await response.json();
        
        if (editingId) {
          setArticles(prev => prev.map(article => 
            article.id === editingId ? { ...savedArticle, categoryName: categories.find(c => c.id === savedArticle.categoryId)?.name } : article
          ));
        } else {
          setArticles(prev => [...prev, { ...savedArticle, categoryName: categories.find(c => c.id === savedArticle.categoryId)?.name }]);
        }
        
        handleCancel();
      }
    } catch (error) {
      console.error('Failed to save article:', error);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      const response = await fetch(`/api/kb/articles?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setArticles(prev => prev.filter(article => article.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      summary: '',
      tags: '',
      categoryId: '',
    });
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r bg-muted/50 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleCreateArticle} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>

        <div className="mt-6 space-y-2">
          {filteredArticles.map((article) => (
            <Card 
              key={article.id} 
              className={`cursor-pointer transition-colors hover:bg-accent ${
                editingId === article.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleEditArticle(article)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{article.title}</CardTitle>
                <CardDescription className="text-xs">
                  {article.categoryName}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {article.summary || article.content.substring(0, 100) + '...'}
                </p>
                {article.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.tags.split(',').slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {(isCreating || editingId) ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingId ? 'Edit Article' : 'Create New Article'}
              </h2>
              <div className="flex gap-2">
                <Button onClick={handleSaveArticle}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter article title..."
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief summary of the article..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3..."
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter the full article content..."
                  rows={15}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No Article Selected</h3>
              <p>Select an article from the sidebar to edit, or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}