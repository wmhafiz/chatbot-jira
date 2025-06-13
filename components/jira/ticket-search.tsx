'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { searchJiraTicketsAction } from '@/lib/actions/jira';
import { TicketCard } from './ticket-card';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchFilters {
  query: string;
  status: string[];
  priority: string[];
  assignee: string;
  projectKey: string;
}

interface TicketSearchProps {
  onTicketSelect?: (ticket: any) => void;
  onTicketAction?: (action: string, ticket: any) => void;
  initialFilters?: Partial<SearchFilters>;
  showFilters?: boolean;
  compact?: boolean;
  maxResults?: number;
}

const statusOptions = [
  'Open',
  'In Progress',
  'In Review',
  'Done',
  'Closed',
  'Cancelled',
];

const priorityOptions = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

export function TicketSearch({
  onTicketSelect,
  onTicketAction,
  initialFilters = {},
  showFilters = true,
  compact = false,
  maxResults = 20,
}: TicketSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: [],
    priority: [],
    assignee: '',
    projectKey: '',
    ...initialFilters,
  });

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce search query to avoid too many API calls
  const debouncedQuery = useDebounce(filters.query, 300);

  const searchTickets = useCallback(async (searchFilters: SearchFilters) => {
    setLoading(true);
    setError(null);

    try {
      const result = await searchJiraTicketsAction({
        query: searchFilters.query || undefined,
        status: searchFilters.status.length > 0 ? searchFilters.status : undefined,
        priority: searchFilters.priority.length > 0 ? searchFilters.priority : undefined,
        assignee: searchFilters.assignee || undefined,
        projectKey: searchFilters.projectKey || undefined,
        maxResults,
        startAt: 0,
      });

      if (result.success) {
        setTickets(result.data || []);
      } else {
        setError(result.error || 'Failed to search tickets');
        setTickets([]);
      }
    } catch (err) {
      setError('An error occurred while searching tickets');
      setTickets([]);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [maxResults]);

  // Trigger search when debounced query or filters change
  useEffect(() => {
    if (debouncedQuery || filters.status.length > 0 || filters.priority.length > 0 || filters.assignee || filters.projectKey) {
      searchTickets({ ...filters, query: debouncedQuery });
    } else {
      setTickets([]);
    }
  }, [debouncedQuery, filters.status, filters.priority, filters.assignee, filters.projectKey, searchTickets]);

  const handleQueryChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  };

  const handlePriorityToggle = (priority: string) => {
    setFilters(prev => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter(p => p !== priority)
        : [...prev.priority, priority],
    }));
  };

  const handleAssigneeChange = (assignee: string) => {
    setFilters(prev => ({ ...prev, assignee }));
  };

  const handleProjectKeyChange = (projectKey: string) => {
    setFilters(prev => ({ ...prev, projectKey }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      status: [],
      priority: [],
      assignee: '',
      projectKey: '',
    });
    setTickets([]);
  };

  const handleTicketClick = (ticket: any) => {
    onTicketSelect?.(ticket);
  };

  const handleTicketAction = (action: string, ticket: any) => {
    onTicketAction?.(action, ticket);
  };

  const hasActiveFilters = filters.query || filters.status.length > 0 || filters.priority.length > 0 || filters.assignee || filters.projectKey;

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <Card>
        <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
          <CardTitle className={`${compact ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
            <Search className="h-4 w-4" />
            Search Jira Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search tickets by title, description, or issue key..."
                value={filters.query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full"
              />
            </div>
            {showFilters && (
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && showAdvancedFilters && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {statusOptions.map((status) => (
                      <Badge
                        key={status}
                        variant={filters.status.includes(status) ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleStatusToggle(status)}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="flex flex-wrap gap-1">
                    {priorityOptions.map((priority) => (
                      <Badge
                        key={priority}
                        variant={filters.priority.includes(priority) ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handlePriorityToggle(priority)}
                      >
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Assignee Filter */}
                <div className="space-y-2">
                  <Label htmlFor="assignee" className="text-sm font-medium">Assignee</Label>
                  <Input
                    id="assignee"
                    placeholder="Enter assignee email or username"
                    value={filters.assignee}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                  />
                </div>

                {/* Project Key Filter */}
                <div className="space-y-2">
                  <Label htmlFor="projectKey" className="text-sm font-medium">Project Key</Label>
                  <Input
                    id="projectKey"
                    placeholder="e.g., SUPPORT, PROD"
                    value={filters.projectKey}
                    onChange={(e) => handleProjectKeyChange(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filters.query && (
                <Badge variant="secondary">
                  Query: &quot;{filters.query}&quot;
                </Badge>
              )}
              {filters.status.map((status) => (
                <Badge key={status} variant="secondary">
                  Status: {status}
                </Badge>
              ))}
              {filters.priority.map((priority) => (
                <Badge key={priority} variant="secondary">
                  Priority: {priority}
                </Badge>
              ))}
              {filters.assignee && (
                <Badge variant="secondary">
                  Assignee: {filters.assignee}
                </Badge>
              )}
              {filters.projectKey && (
                <Badge variant="secondary">
                  Project: {filters.projectKey}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Searching tickets...</span>
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="py-6">
              <div className="text-center text-red-600">
                <p className="font-medium">Search Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && tickets.length === 0 && hasActiveFilters && (
          <Card>
            <CardContent className="py-6">
              <div className="text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No tickets found</p>
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && tickets.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id || ticket.key}
                  ticket={ticket}
                  onViewDetails={handleTicketClick}
                  onLinkKb={(ticket) => handleTicketAction('link-kb', ticket)}
                  onAddComment={(ticket) => handleTicketAction('add-comment', ticket)}
                  compact={compact}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}