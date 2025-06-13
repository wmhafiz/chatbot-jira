'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Link, MessageSquare, User, Calendar, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JiraTicket {
  id: string;
  issueKey: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: string;
  reporter?: string;
  createdAt: string;
  updatedAt: string;
  linkedKbEntries?: Array<{
    id: string;
    title: string;
    category: string;
    similarity?: number;
  }>;
}

interface TicketCardProps {
  ticket: JiraTicket;
  onViewDetails?: (ticket: JiraTicket) => void;
  onLinkKb?: (ticket: JiraTicket) => void;
  onAddComment?: (ticket: JiraTicket) => void;
  showActions?: boolean;
  compact?: boolean;
}

const priorityColors = {
  Low: 'bg-green-100 text-green-800 border-green-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  High: 'bg-orange-100 text-orange-800 border-orange-200',
  Critical: 'bg-red-100 text-red-800 border-red-200',
};

const statusColors = {
  Open: 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
  'In Review': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Done: 'bg-green-100 text-green-800 border-green-200',
  Closed: 'bg-gray-100 text-gray-800 border-gray-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export function TicketCard({
  ticket,
  onViewDetails,
  onLinkKb,
  onAddComment,
  showActions = true,
  compact = false,
}: TicketCardProps) {
  const jiraBaseUrl = process.env.NEXT_PUBLIC_JIRA_BASE_URL || '';
  const jiraUrl = jiraBaseUrl ? `${jiraBaseUrl}/browse/${ticket.issueKey}` : '';

  const priorityColor = priorityColors[ticket.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800 border-gray-200';
  const statusColor = statusColors[ticket.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200';

  const handleViewDetails = () => {
    onViewDetails?.(ticket);
  };

  const handleLinkKb = () => {
    onLinkKb?.(ticket);
  };

  const handleAddComment = () => {
    onAddComment?.(ticket);
  };

  const handleOpenInJira = () => {
    if (jiraUrl) {
      window.open(jiraUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className={compact ? 'pb-2' : 'pb-4'}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900 truncate`}>
              <span className="text-blue-600 font-mono text-sm mr-2">
                {ticket.issueKey}
              </span>
              {ticket.title}
            </CardTitle>
            {!compact && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {ticket.description}
              </p>
            )}
          </div>
          {jiraUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInJira}
              className="ml-2 flex-shrink-0"
              title="Open in Jira"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className={compact ? 'pt-0' : 'pt-2'}>
        <div className="space-y-3">
          {/* Status and Priority Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={statusColor}>
              {ticket.status}
            </Badge>
            <Badge variant="outline" className={priorityColor}>
              <AlertCircle className="h-3 w-3 mr-1" />
              {ticket.priority}
            </Badge>
          </div>

          {/* Assignee and Reporter */}
          {!compact && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {ticket.assignee && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Assigned to: {ticket.assignee}</span>
                </div>
              )}
              {ticket.reporter && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Reporter: {ticket.reporter}</span>
                </div>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Linked KB Entries */}
          {ticket.linkedKbEntries && ticket.linkedKbEntries.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                  <Link className="h-3 w-3" />
                  <span>Linked KB Entries ({ticket.linkedKbEntries.length})</span>
                </div>
                <div className="space-y-1">
                  {ticket.linkedKbEntries.slice(0, compact ? 2 : 3).map((kbEntry) => (
                    <div
                      key={kbEntry.id}
                      className="flex items-center justify-between text-xs bg-gray-50 rounded p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {kbEntry.title}
                        </p>
                        <p className="text-gray-500">
                          {kbEntry.category}
                          {kbEntry.similarity && (
                            <span className="ml-2">
                              ({Math.round(kbEntry.similarity * 100)}% match)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                  {ticket.linkedKbEntries.length > (compact ? 2 : 3) && (
                    <p className="text-xs text-gray-500 text-center">
                      +{ticket.linkedKbEntries.length - (compact ? 2 : 3)} more entries
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          {showActions && (
            <>
              <Separator />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewDetails}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLinkKb}
                  className="flex items-center gap-1"
                >
                  <Link className="h-3 w-3" />
                  Link KB
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddComment}
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  Comment
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}