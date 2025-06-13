'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  X, 
  Save, 
  Download, 
  Calendar,
  Tag as TagIcon,
  Folder,
  SortAsc,
  SortDesc,
  Loader2,
  BookmarkPlus,
  History
} from 'lucide-react';
// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface SearchFilters {
  query: string;
  categoryId?: string;
  tags: string[];
  status?: 'draft' | 'published' | 'archived';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy: 'relevance' | 'date' | 'title' | 'views';
  sortOrder: 'asc' | 'desc';
  useVector: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string | null;
  categoryId: string;
  categoryName?: string;
  createdAt: Date;
  updatedAt: Date;
  status?: string;
  severity?: string;
  similarity?: number;
  highlights?: string[];
}

interface Category {
  id: string;
  name: string;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
}

interface SearchInterfaceProps {
  categories: Category[];
  onSearch: (filters: SearchFilters) => Promise<SearchResult[]>;
  onSaveSearch?: (name: string, filters: SearchFilters) => Promise<void>;
  onLoadSearch?: (search: SavedSearch) => void;
  onExportResults?: (results: SearchResult[]) => void;
  savedSearches?: SavedSearch[];
  initialFilters?: Partial<SearchFilters>;
  className?: string;
}

const defaultFilters: SearchFilters = {
  query: '',
  tags: [],
  sortBy: 'relevance',
  sortOrder: 'desc',
  useVector: true,
};

export function SearchInterface({
  categories,
  onSearch,
  onSaveSearch,
  onLoadSearch,
  onExportResults,
  savedSearches = [],
  initialFilters = {},
  className = ''
}: SearchInterfaceProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    ...defaultFilters,
    ...initialFilters,
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchFilters: SearchFilters) => {
      if (!searchFilters.query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await onSearch(searchFilters);
        setResults(searchResults);
        
        // Add to search history
        if (searchFilters.query && !searchHistory.includes(searchFilters.query)) {
          setSearchHistory(prev => [searchFilters.query, ...prev.slice(0, 9)]);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [onSearch, searchHistory]
  );

  // Trigger search when filters change
  useEffect(() => {
    debouncedSearch(filters);
  }, [filters, debouncedSearch]);

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilter('tags', [...filters.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim() || !onSaveSearch) return;
    
    try {
      await onSaveSearch(saveSearchName.trim(), filters);
      setSaveSearchName('');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const handleLoadSearch = (search: SavedSearch) => {
    setFilters(search.filters);
    onLoadSearch?.(search);
  };

  const handleExportResults = () => {
    if (onExportResults) {
      onExportResults(results);
    }
  };

  const getResultHighlight = (result: SearchResult) => {
    if (result.highlights && result.highlights.length > 0) {
      return result.highlights[0];
    }
    return result.summary || result.content.substring(0, 200) + '...';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <div className="space-y-4">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-10 pr-12 h-12 text-lg"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {(filters.categoryId || filters.tags.length > 0 || filters.status || filters.severity) && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {[filters.categoryId, ...filters.tags, filters.status, filters.severity].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            
            {savedSearches.length > 0 && (
              <Select onValueChange={(value) => {
                const search = savedSearches.find(s => s.id === value);
                if (search) handleLoadSearch(search);
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Saved searches" />
                </SelectTrigger>
                <SelectContent>
                  {savedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            {results.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {results.length} results
              </span>
            )}
            
            {onSaveSearch && filters.query && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
              >
                <BookmarkPlus className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
            
            {results.length > 0 && onExportResults && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportResults}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {(filters.categoryId || filters.tags.length > 0 || filters.status || filters.severity) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            
            {filters.categoryId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Folder className="h-3 w-3" />
                {categories.find(c => c.id === filters.categoryId)?.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => updateFilter('categoryId', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {filters.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                <TagIcon className="h-3 w-3" />
                {tag}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {filters.status && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {filters.status}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => updateFilter('status', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {filters.severity && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Severity: {filters.severity}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => updateFilter('severity', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={filters.categoryId || ''}
                  onValueChange={(value) => updateFilter('categoryId', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => updateFilter('status', value as any || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Severity Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={filters.severity || ''}
                  onValueChange={(value) => updateFilter('severity', value as any || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All severities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => updateFilter('sortBy', value as any)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="views">Views</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {filters.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    <TagIcon className="h-3 w-3" />
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add tags (press Enter)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.currentTarget.value.trim();
                    if (value) {
                      addTag(value);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>

            {/* Search Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.useVector}
                  onChange={(e) => updateFilter('useVector', e.target.checked)}
                />
                Use semantic search
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        {results.map((result) => (
          <Card key={result.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">
                    <a 
                      href={`/kb/${result.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {result.title}
                    </a>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-3">
                    {result.categoryName && (
                      <Badge variant="outline" className="text-xs">
                        {result.categoryName}
                      </Badge>
                    )}
                    {result.similarity && (
                      <span className="text-xs">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                    )}
                    <span className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(result.updatedAt).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {getResultHighlight(result)}
              </p>
              {result.tags && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {result.tags.split(',').slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filters.query && results.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-medium mb-4">Save Search</h3>
            <Input
              placeholder="Enter search name..."
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              className="mb-4"
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleSaveSearch} disabled={!saveSearchName.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}