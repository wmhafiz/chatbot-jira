'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Database, 
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AnalyticsData {
  kbStats: {
    totalViews: number;
    totalArticles: number;
    popularCategories: Array<{ categoryId: string; viewCount: number }>;
    recentSearches: number;
  };
  chatStats: {
    totalChats: number;
    totalMessages: number;
    activeUsers: number;
    averageMessagesPerChat: number;
  };
  jiraStats: {
    totalTickets: number;
    ticketsByStatus: Array<{ status: string; count: number }>;
    ticketsByPriority: Array<{ priority: string; count: number }>;
    recentActivity: number;
  };
  systemHealth: {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      message?: string;
    }>;
    uptime: number;
  };
  performance: {
    summary: {
      totalRequests: number;
      averageResponseTime: number;
      p95ResponseTime: number;
      errorRate: number;
    };
    slowestOperations: Array<{
      name: string;
      averageTime: number;
      maxTime: number;
      count: number;
    }>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Production Support Chatbot Performance & Usage Analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchAnalytics} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {data?.systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Health
            </CardTitle>
            <CardDescription>
              Overall system status and component health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(data.systemHealth.overall)}
                <span className={`font-semibold ${getStatusColor(data.systemHealth.overall)}`}>
                  {data.systemHealth.overall.toUpperCase()}
                </span>
              </div>
              <Badge variant="outline">
                Uptime: {formatUptime(data.systemHealth.uptime)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {data.systemHealth.checks.map((check) => (
                <div key={check.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium capitalize">{check.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {check.responseTime}ms
                    </div>
                  </div>
                  {getStatusIcon(check.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {data?.performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Metrics
            </CardTitle>
            <CardDescription>
              System performance and response times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.performance.summary.totalRequests}</div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(data.performance.summary.averageResponseTime)}ms</div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(data.performance.summary.p95ResponseTime)}ms</div>
                <div className="text-sm text-muted-foreground">95th Percentile</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.performance.summary.errorRate.toFixed(2)}%</div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
              </div>
            </div>

            {data.performance.slowestOperations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Slowest Operations</h4>
                <div className="space-y-2">
                  {data.performance.slowestOperations.slice(0, 5).map((op, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{op.name}</span>
                      <div className="text-right">
                        <div className="text-sm">{Math.round(op.averageTime)}ms avg</div>
                        <div className="text-xs text-muted-foreground">{op.count} calls</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Base Analytics */}
        {data?.kbStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Knowledge Base
              </CardTitle>
              <CardDescription>
                KB usage and content statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.kbStats.totalViews}</div>
                  <div className="text-sm text-muted-foreground">Total Views</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.kbStats.totalArticles}</div>
                  <div className="text-sm text-muted-foreground">Articles</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Popular Categories</h4>
                <div className="space-y-2">
                  {data.kbStats.popularCategories.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{category.categoryId}</span>
                      <Badge variant="secondary">{category.viewCount} views</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Analytics */}
        {data?.chatStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Chat Activity
              </CardTitle>
              <CardDescription>
                User engagement and chat statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.chatStats.totalChats}</div>
                  <div className="text-sm text-muted-foreground">Total Chats</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.chatStats.activeUsers}</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Messages</span>
                  <span className="font-semibold">{data.chatStats.totalMessages}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Messages/Chat</span>
                  <span className="font-semibold">{data.chatStats.averageMessagesPerChat.toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jira Integration Analytics */}
        {data?.jiraStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Jira Integration
              </CardTitle>
              <CardDescription>
                Ticket management and integration stats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.jiraStats.totalTickets}</div>
                <div className="text-sm text-muted-foreground">Total Tickets</div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">By Status</h4>
                <div className="space-y-2">
                  {data.jiraStats.ticketsByStatus.slice(0, 5).map((status, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{status.status}</span>
                      <Badge variant="outline">{status.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">By Priority</h4>
                <div className="space-y-2">
                  {data.jiraStats.ticketsByPriority.slice(0, 3).map((priority, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{priority.priority}</span>
                      <Badge variant="outline">{priority.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}