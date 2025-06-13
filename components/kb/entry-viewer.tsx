'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  User, 
  Tag as TagIcon, 
  Edit, 
  Share, 
  Copy, 
  Eye, 
  Clock,
  CheckCircle,
  Archive,
  AlertTriangle,
  ExternalLink,
  History,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';

interface KBEntry {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string | null;
  categoryId: string;
  categoryName?: string;
  userId: string;
  userName?: string;
  createdAt: Date;
  updatedAt: Date;
  status?: 'draft' | 'published' | 'archived';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  viewCount?: number;
  version?: number;
  lastViewedAt?: Date;
}

interface RelatedEntry {
  id: string;
  title: string;
  similarity?: number;
  categoryName?: string;
}

interface EntryViewerProps {
  entry: KBEntry;
  relatedEntries?: RelatedEntry[];
  showActions?: boolean;
  showMetadata?: boolean;
  showRelated?: boolean;
  onEdit?: (id: string) => void;
  onShare?: (id: string) => void;
  onRate?: (id: string, rating: 'up' | 'down') => void;
  className?: string;
}

export function EntryViewer({
  entry,
  relatedEntries = [],
  showActions = true,
  showMetadata = true,
  showRelated = true,
  onEdit,
  onShare,
  onRate,
  className = ''
}: EntryViewerProps) {
  const [copied, setCopied] = useState(false);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'draft': return 'secondary';
      case 'archived': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return null;
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(entry.id);
    } else if (navigator.share) {
      navigator.share({
        title: entry.title,
        text: entry.summary || entry.content.substring(0, 200) + '...',
        url: window.location.href,
      });
    }
  };

  const tags = entry.tags ? entry.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-3">{entry.title}</h1>
            
            {/* Status and Category Badges */}
            <div className="flex items-center gap-2 mb-4">
              {entry.categoryName && (
                <Badge variant="outline" className="text-sm">
                  {entry.categoryName}
                </Badge>
              )}
              {entry.status && (
                <Badge variant={getStatusColor(entry.status)} className="text-sm flex items-center gap-1">
                  {getStatusIcon(entry.status)}
                  {entry.status}
                </Badge>
              )}
              {entry.severity && (
                <Badge variant={getSeverityColor(entry.severity)} className="text-sm flex items-center gap-1">
                  {getSeverityIcon(entry.severity)}
                  {entry.severity}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/kb/${entry.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {entry.summary && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed">{entry.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        {showMetadata && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Updated {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Created {format(new Date(entry.createdAt), 'MMM d, yyyy')}</span>
            </div>
            {entry.userName && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{entry.userName}</span>
              </div>
            )}
            {entry.viewCount !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{entry.viewCount} views</span>
              </div>
            )}
            {entry.version && (
              <div className="flex items-center gap-1">
                <History className="h-4 w-4" />
                <span>Version {entry.version}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-sm">
                <TagIcon className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <div className="whitespace-pre-wrap leading-relaxed">
          {entry.content}
        </div>
      </div>

      {/* Rating */}
      {onRate && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Was this helpful?</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRate(entry.id, 'up')}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRate(entry.id, 'down')}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  No
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Entries */}
      {showRelated && relatedEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Related Articles</CardTitle>
            <CardDescription>
              Other articles that might be helpful
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatedEntries.map((related) => (
              <div key={related.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                <div className="flex-1">
                  <Link 
                    href={`/kb/${related.id}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {related.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {related.categoryName && (
                      <Badge variant="outline" className="text-xs">
                        {related.categoryName}
                      </Badge>
                    )}
                    {related.similarity && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(related.similarity * 100)}% match
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/kb/${related.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Compact version for embedding in other components
export function CompactEntryViewer({
  entry,
  showActions = false,
  className = ''
}: Pick<EntryViewerProps, 'entry' | 'showActions' | 'className'>) {
  const tags = entry.tags ? entry.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">
              <Link 
                href={`/kb/${entry.id}`}
                className="hover:text-primary transition-colors"
              >
                {entry.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              {entry.categoryName && (
                <Badge variant="outline" className="text-xs">
                  {entry.categoryName}
                </Badge>
              )}
              <span className="text-xs">
                {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
              </span>
            </CardDescription>
          </div>
          {showActions && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/kb/${entry.id}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {entry.summary || entry.content.substring(0, 200) + '...'}
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <TagIcon className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}