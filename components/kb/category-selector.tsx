'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Check, 
  X, 
  Folder, 
  FolderPlus,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface CategorySelectorProps {
  categories: Category[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  allowCreate?: boolean;
  onCreateCategory?: (name: string, description?: string) => Promise<Category>;
  className?: string;
  disabled?: boolean;
}

export function CategorySelector({
  categories,
  value,
  onValueChange,
  placeholder = "Select category",
  allowCreate = false,
  onCreateCategory,
  className,
  disabled = false
}: CategorySelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !onCreateCategory) return;

    setIsLoading(true);
    try {
      const newCategory = await onCreateCategory(
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined
      );
      
      // Select the newly created category
      onValueChange?.(newCategory.id);
      
      // Reset form
      setNewCategoryName('');
      setNewCategoryDescription('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewCategoryName('');
    setNewCategoryDescription('');
  };

  const selectedCategory = categories.find(cat => cat.id === value);

  if (isCreating) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderPlus className="h-4 w-4" />
            Create New Category
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name *</Label>
            <Input
              id="category-name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name..."
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category-description">Description</Label>
            <Input
              id="category-description"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              placeholder="Brief description (optional)..."
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || isLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              Create
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelCreate}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn("w-full", className)}>
          <SelectValue placeholder={placeholder}>
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>{selectedCategory.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Search */}
          {categories.length > 5 && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>
          )}
          
          {/* Categories */}
          {filteredCategories.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No categories found
            </div>
          ) : (
            filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2 w-full">
                  <Folder className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-muted-foreground">
                        {category.description}
                      </div>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
          
          {/* Create New Category Option */}
          {allowCreate && onCreateCategory && (
            <>
              <div className="border-t my-1" />
              <div
                className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4" />
                Create new category
              </div>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// Simplified version for basic use cases
export function SimpleCategorySelector({
  categories,
  value,
  onValueChange,
  placeholder = "Select category",
  className,
  disabled = false
}: Omit<CategorySelectorProps, 'allowCreate' | 'onCreateCategory'>) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              {category.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}