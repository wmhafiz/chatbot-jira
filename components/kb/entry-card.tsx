'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  User, 
  Tag, 
  Eye, 
  Edit, 
  Trash2, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Archive
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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
}

interface EntryCardProps {
  entry: KBEntry;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  className?: string;
}

export function EntryCard({
  entry,
  variant = 'default',
  showActions = true,
  onEdit,
  onDelete,
  onView,
  className = ''
}: EntryCardProps) {
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
      case 'published': return <CheckCircle className="h-3 w-3" />;
      case 'draft': return <Clock className="h-3 w-3" />;
      case 'archived': return <Archive className="h-3 w-3" />;
      default: return null;
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const renderCompactCard = () => (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium line-clamp-1">
            <Link 
              href={`/kb/${entry.id}`}
              className="hover:text-primary transition-colors"
              onClick={() => onView?.(entry.id)}
            >
              {entry.title}
            </Link>
          </CardTitle>
          {showActions && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                <Link href={`/kb/${entry.id}`}>
                  <Eye className="h-3 w-3" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                <Link href={`/kb/${entry.id}/edit`}>
                  <Edit className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </div>
        <CardDescription className="text-xs">
          {entry.categoryName}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-1">
          {entry.summary || entry.content.substring(0, 80) + '...'}
        </p>
      </CardContent>
    </Card>
  );

  const renderDefaultCard = () => (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">
              <Link 
                href={`/kb/${entry.id}`}
                className="hover:text-primary transition-colors"
                onClick={() => onView?.(entry.id)}
              >
                {entry.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
              </span>
              {entry.categoryName && (
                <Badge variant="outline" className="text-xs">
                  {entry.categoryName}
                </Badge>
              )}
              {entry.status && (
                <Badge variant={getStatusColor(entry.status)} className="text-xs flex items-center gap-1">
                  {getStatusIcon(entry.status)}
                  {entry.status}
                </Badge>
              )}
              {entry.severity && (
                <Badge variant={getSeverityColor(entry.severity)} className="text-xs flex items-center gap-1">
                  {getSeverityIcon(entry.severity)}
                  {entry.severity}
                </Badge>
              )}
            </CardDescription>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/kb/${entry.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/kb/${entry.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(entry.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {entry.summary || entry.content.substring(0, 150) + '...'}
        </p>
        
        {entry.tags && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.split(',').slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag.trim()}
              </Badge>
            ))}
            {entry.tags.split(',').length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{entry.tags.split(',').length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderDetailedCard = () => (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">
              <Link 
                href={`/kb/${entry.id}`}
                className="hover:text-primary transition-colors"
                onClick={() => onView?.(entry.id)}
              >
                {entry.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Updated {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </span>
              {entry.userName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.userName}
                </span>
              )}
              {entry.viewCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {entry.viewCount} views
                </span>
              )}
            </CardDescription>
            <div className="flex items-center gap-2 mb-3">
              {entry.categoryName && (
                <Badge variant="outline">
                  {entry.categoryName}
                </Badge>
              )}
              {entry.status && (
                <Badge variant={getStatusColor(entry.status)} className="flex items-center gap-1">
                  {getStatusIcon(entry.status)}
                  {entry.status}
                </Badge>
              )}
              {entry.severity && (
                <Badge variant={getSeverityColor(entry.severity)} className="flex items-center gap-1">
                  {getSeverityIcon(entry.severity)}
                  {entry.severity}
                </Badge>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/kb/${entry.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/kb/${entry.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(entry.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-muted-foreground mb-4 leading-relaxed">
          {entry.summary || entry.content.substring(0, 300) + '...'}
        </p>
        
        {entry.tags && (
          <div className="flex flex-wrap gap-2">
            {entry.tags.split(',').map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-sm">
                <Tag className="h-3 w-3 mr-1" />
                {tag.trim()}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  switch (variant) {
    case 'compact':
      return renderCompactCard();
    case 'detailed':
      return renderDetailedCard();
    default:
      return renderDefaultCard();
  }
}