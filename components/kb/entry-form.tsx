'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  Eye, 
  X, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Loader2,
  FileText,
  Tag as TagIcon
} from 'lucide-react';
import { CategorySelector } from './category-selector';
import { TagInput } from './tag-input';

interface KBEntry {
  id?: string;
  title: string;
  content: string;
  summary: string;
  tags: string;
  categoryId: string;
  status: 'draft' | 'published' | 'archived';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface EntryFormProps {
  entry?: Partial<KBEntry>;
  categories: Category[];
  isLoading?: boolean;
  isPreview?: boolean;
  onSave?: (data: KBEntry) => Promise<void>;
  onCancel?: () => void;
  onPreview?: (data: KBEntry) => void;
  onAutoSave?: (data: Partial<KBEntry>) => void;
  validationErrors?: Record<string, string>;
  className?: string;
}

export function EntryForm({
  entry,
  categories,
  isLoading = false,
  isPreview = false,
  onSave,
  onCancel,
  onPreview,
  onAutoSave,
  validationErrors = {},
  className = ''
}: EntryFormProps) {
  const [formData, setFormData] = useState<KBEntry>({
    title: entry?.title || '',
    content: entry?.content || '',
    summary: entry?.summary || '',
    tags: entry?.tags || '',
    categoryId: entry?.categoryId || '',
    status: entry?.status || 'draft',
    severity: entry?.severity || 'medium',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPreview, setShowPreview] = useState(isPreview);

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && onAutoSave) {
      const timer = setTimeout(() => {
        setAutoSaveStatus('saving');
        onAutoSave(formData);
        setTimeout(() => {
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        }, 500);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [formData, isDirty, onAutoSave]);

  const handleInputChange = (field: keyof KBEntry, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave(formData);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save entry:', error);
      }
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(formData);
    }
    setShowPreview(!showPreview);
  };

  const isFormValid = () => {
    return formData.title.trim() && 
           formData.content.trim() && 
           formData.categoryId &&
           Object.keys(validationErrors).length === 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'draft': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'archived': return <FileText className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const renderPreview = () => (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preview</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
            <X className="h-4 w-4 mr-2" />
            Close Preview
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">{formData.title || 'Untitled'}</h1>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">
              {categories.find(c => c.id === formData.categoryId)?.name || 'No Category'}
            </Badge>
            <Badge variant={getSeverityColor(formData.severity)}>
              {formData.severity}
            </Badge>
            <div className="flex items-center gap-1">
              {getStatusIcon(formData.status)}
              <span className="text-sm text-muted-foreground">{formData.status}</span>
            </div>
          </div>
        </div>
        
        {formData.summary && (
          <div>
            <h3 className="font-medium mb-2">Summary</h3>
            <p className="text-muted-foreground">{formData.summary}</p>
          </div>
        )}
        
        <Separator />
        
        <div>
          <h3 className="font-medium mb-2">Content</h3>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans">{formData.content}</pre>
          </div>
        </div>
        
        {formData.tags && (
          <div>
            <h3 className="font-medium mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {formData.tags.split(',').map((tag, index) => (
                <Badge key={index} variant="secondary">
                  <TagIcon className="h-3 w-3 mr-1" />
                  {tag.trim()}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {entry?.id ? 'Edit Entry' : 'Create New Entry'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {autoSaveStatus === 'saving' && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </div>
            )}
            {autoSaveStatus === 'saved' && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-3 w-3" />
                Auto-saved
              </div>
            )}
            {isDirty && autoSaveStatus === 'idle' && (
              <div className="flex items-center gap-1 text-sm text-yellow-600">
                <Clock className="h-3 w-3" />
                Unsaved changes
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!formData.title && !formData.content}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isFormValid() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the following errors:
            <ul className="mt-2 list-disc list-inside">
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Fields */}
      <div className="grid gap-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter a descriptive title..."
            className={validationErrors.title ? 'border-destructive' : ''}
          />
          {validationErrors.title && (
            <p className="text-sm text-destructive">{validationErrors.title}</p>
          )}
        </div>

        {/* Category and Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <CategorySelector
              categories={categories}
              value={formData.categoryId}
              onValueChange={(value: string) => handleInputChange('categoryId', value)}
              placeholder="Select category"
              className={validationErrors.categoryId ? 'border-destructive' : ''}
            />
            {validationErrors.categoryId && (
              <p className="text-sm text-destructive">{validationErrors.categoryId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Draft
                  </div>
                </SelectItem>
                <SelectItem value="published">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Published
                  </div>
                </SelectItem>
                <SelectItem value="archived">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Archived
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select value={formData.severity} onValueChange={(value: any) => handleInputChange('severity', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            value={formData.summary}
            onChange={(e) => handleInputChange('summary', e.target.value)}
            placeholder="Brief summary of the entry (optional but recommended)..."
            rows={3}
            className={validationErrors.summary ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground">
            {formData.summary.length}/500 characters
          </p>
          {validationErrors.summary && (
            <p className="text-sm text-destructive">{validationErrors.summary}</p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <TagInput
            value={formData.tags}
            onChange={(value: string) => handleInputChange('tags', value)}
            placeholder="Add tags separated by commas..."
          />
          <p className="text-sm text-muted-foreground">
            Use tags to help categorize and search for this entry
          </p>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            placeholder="Enter the full content of the knowledge base entry..."
            rows={20}
            className={`font-mono ${validationErrors.content ? 'border-destructive' : ''}`}
          />
          <p className="text-sm text-muted-foreground">
            {formData.content.length} characters
          </p>
          {validationErrors.content && (
            <p className="text-sm text-destructive">{validationErrors.content}</p>
          )}
        </div>
      </div>

      {/* Preview */}
      {showPreview && renderPreview()}
    </div>
  );
}