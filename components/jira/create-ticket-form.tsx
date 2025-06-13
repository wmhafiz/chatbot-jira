'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2, AlertCircle, CheckCircle, Link, X } from 'lucide-react';
import { createJiraTicketAction } from '@/lib/actions/jira';

interface CreateTicketFormProps {
  onTicketCreated?: (ticket: any) => void;
  onCancel?: () => void;
  trigger?: React.ReactNode;
  initialData?: {
    title?: string;
    description?: string;
    priority?: string;
    assignee?: string;
    chatId?: string;
  };
  showDialog?: boolean;
  className?: string;
}

interface FormData {
  title: string;
  description: string;
  issueType: string;
  priority: string;
  assignee: string;
  projectKey: string;
  labels: string[];
  linkKbEntries: boolean;
}

const issueTypes = [
  { value: 'Task', label: 'Task' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Story', label: 'Story' },
  { value: 'Epic', label: 'Epic' },
];

const priorities = [
  { value: 'Low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'Medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'High', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'Critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

export function CreateTicketForm({
  onTicketCreated,
  onCancel,
  trigger,
  initialData = {},
  showDialog = true,
  className = '',
}: CreateTicketFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  const [formData, setFormData] = useState<FormData>({
    title: initialData.title || '',
    description: initialData.description || '',
    issueType: 'Task',
    priority: initialData.priority || 'Medium',
    assignee: initialData.assignee || '',
    projectKey: '',
    labels: [],
    linkKbEntries: true,
  });

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleAddLabel = () => {
    if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
      setFormData(prev => ({
        ...prev,
        labels: [...prev.labels, newLabel.trim()],
      }));
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(label => label !== labelToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createJiraTicketAction({
        title: formData.title,
        description: formData.description,
        issueType: formData.issueType,
        priority: formData.priority as 'Low' | 'Medium' | 'High' | 'Critical',
        assignee: formData.assignee || undefined,
        projectKey: formData.projectKey || undefined,
        labels: formData.labels.length > 0 ? formData.labels : undefined,
        chatId: initialData.chatId,
        linkKbEntries: formData.linkKbEntries,
      });

      if (result.success) {
        setSuccess(`Ticket ${result.data.issueKey} created successfully!`);
        onTicketCreated?.(result.data);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          issueType: 'Task',
          priority: 'Medium',
          assignee: '',
          projectKey: '',
          labels: [],
          linkKbEntries: true,
        });

        if (showDialog) {
          setTimeout(() => {
            setOpen(false);
            setSuccess(null);
          }, 2000);
        }
      } else {
        setError(result.error || 'Failed to create ticket');
      }
    } catch (err) {
      setError('An error occurred while creating the ticket');
      console.error('Create ticket error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setError(null);
    setSuccess(null);
    onCancel?.();
  };

  const isFormValid = formData.title.trim() && formData.description.trim();

  const formContent = (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Title *
        </Label>
        <Input
          id="title"
          placeholder="Enter ticket title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description *
        </Label>
        <Textarea
          id="description"
          placeholder="Describe the issue or request in detail"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={4}
          required
          disabled={loading}
        />
      </div>

      {/* Issue Type and Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Issue Type</Label>
          <Select
            value={formData.issueType}
            onValueChange={(value) => handleInputChange('issueType', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {issueTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => handleInputChange('priority', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${priority.color.split(' ')[0]}`} />
                    {priority.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignee and Project Key */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assignee" className="text-sm font-medium">
            Assignee
          </Label>
          <Input
            id="assignee"
            placeholder="Enter assignee email"
            value={formData.assignee}
            onChange={(e) => handleInputChange('assignee', e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectKey" className="text-sm font-medium">
            Project Key
          </Label>
          <Input
            id="projectKey"
            placeholder="e.g., SUPPORT (optional)"
            value={formData.projectKey}
            onChange={(e) => handleInputChange('projectKey', e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Labels */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Labels</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddLabel();
              }
            }}
            disabled={loading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddLabel}
            disabled={!newLabel.trim() || loading}
          >
            Add
          </Button>
        </div>
        {formData.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.labels.map((label) => (
              <Badge key={label} variant="secondary" className="flex items-center gap-1">
                {label}
                <button
                  type="button"
                  onClick={() => handleRemoveLabel(label)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  disabled={loading}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Link KB Entries Option */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="linkKbEntries"
          checked={formData.linkKbEntries}
          onChange={(e) => handleInputChange('linkKbEntries', e.target.checked)}
          disabled={loading}
          className="rounded border-gray-300"
        />
        <Label htmlFor="linkKbEntries" className="text-sm">
          Automatically link related KB entries
        </Label>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">{success}</span>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {showDialog && (
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!isFormValid || loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Ticket
        </Button>
      </div>
    </form>
  );

  if (!showDialog) {
    return formContent;
  }

  const defaultTrigger = (
    <Button className="flex items-center gap-2">
      <Plus className="h-4 w-4" />
      Create Jira Ticket
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Jira Ticket</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}