'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Check, X, Loader2, Link } from 'lucide-react';
import { searchJiraTicketsAction } from '@/lib/actions/jira';
import { useDebounce } from '@/hooks/use-debounce';

interface JiraTicket {
  id: string;
  issueKey: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketSelectorProps {
  onTicketSelect: (ticket: JiraTicket) => void;
  onTicketDeselect?: (ticket: JiraTicket) => void;
  selectedTickets?: JiraTicket[];
  multiSelect?: boolean;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  maxResults?: number;
}

export function TicketSelector({
  onTicketSelect,
  onTicketDeselect,
  selectedTickets = [],
  multiSelect = false,
  trigger,
  title = 'Select Jira Ticket',
  description = 'Search and select a Jira ticket to link',
  maxResults = 20,
}: TicketSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const searchTickets = async (query: string) => {
    if (!query.trim()) {
      setTickets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await searchJiraTicketsAction({
        query,
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
  };

  useEffect(() => {
    if (debouncedQuery) {
      searchTickets(debouncedQuery);
    } else {
      setTickets([]);
    }
  }, [debouncedQuery]);

  const handleTicketClick = (ticket: JiraTicket) => {
    const isSelected = selectedTickets.some(t => t.id === ticket.id);

    if (isSelected) {
      onTicketDeselect?.(ticket);
    } else {
      onTicketSelect(ticket);
      if (!multiSelect) {
        setOpen(false);
      }
    }
  };

  const isTicketSelected = (ticket: JiraTicket) => {
    return selectedTickets.some(t => t.id === ticket.id);
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
    setTickets([]);
    setError(null);
  };

  const defaultTrigger = (
    <Button variant="outline" className="flex items-center gap-2">
      <Link className="h-4 w-4" />
      {title}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="ticket-search">Search Tickets</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="ticket-search"
                placeholder="Search by title, description, or issue key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Tickets Summary */}
          {multiSelect && selectedTickets.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Selected Tickets ({selectedTickets.length})
              </Label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {selectedTickets.map((ticket) => (
                  <Badge
                    key={ticket.id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <span className="font-mono text-xs">{ticket.issueKey}</span>
                    <button
                      onClick={() => onTicketDeselect?.(ticket)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Searching tickets...</span>
              </div>
            )}

            {error && (
              <div className="text-center text-red-600 py-4">
                <p className="font-medium">Search Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            {!loading && !error && searchQuery && tickets.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No tickets found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}

            {!loading && !error && !searchQuery && (
              <div className="text-center text-gray-500 py-8">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Start typing to search</p>
                <p className="text-sm mt-1">Enter a ticket title, description, or issue key</p>
              </div>
            )}

            {tickets.map((ticket) => {
              const isSelected = isTicketSelected(ticket);
              return (
                <Card
                  key={ticket.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleTicketClick(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {ticket.issueKey}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              ticket.priority === 'Critical' || ticket.priority === 'High'
                                ? 'border-red-200 text-red-800'
                                : ticket.priority === 'Medium'
                                ? 'border-yellow-200 text-yellow-800'
                                : 'border-green-200 text-green-800'
                            }
                          >
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline">
                            {ticket.status}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
                          {ticket.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {ticket.description}
                        </p>
                        {ticket.assignee && (
                          <p className="text-xs text-gray-500 mt-2">
                            Assigned to: {ticket.assignee}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {isSelected && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {multiSelect && selectedTickets.length > 0 && (
              <Button onClick={handleClose}>
                Done ({selectedTickets.length} selected)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}