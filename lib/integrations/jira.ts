import { z } from 'zod';

// Jira API response types
export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      statusCategory: {
        key: string;
        name: string;
      };
    };
    priority: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    project: {
      key: string;
      name: string;
    };
    issuetype: {
      name: string;
    };
  };
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

export interface JiraComment {
  id: string;
  body: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  updated: string;
}

// Configuration schema
const jiraConfigSchema = z.object({
  baseUrl: z.string().url(),
  email: z.string().email(),
  apiToken: z.string().min(1),
  projectKey: z.string().min(1),
});

export type JiraConfig = z.infer<typeof jiraConfigSchema>;

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfter: number;
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );

    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.config.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.checkLimit();
      }
    }

    this.requests.push(now);
  }
}

export class JiraClient {
  private config: JiraConfig;
  private rateLimiter: RateLimiter;
  private baseHeaders: Record<string, string>;

  constructor(config: Partial<JiraConfig> = {}) {
    // Validate and set configuration from environment variables and params
    const fullConfig = {
      baseUrl: config.baseUrl || process.env.JIRA_BASE_URL || '',
      email: config.email || process.env.JIRA_EMAIL || '',
      apiToken: config.apiToken || process.env.JIRA_API_TOKEN || '',
      projectKey: config.projectKey || process.env.JIRA_PROJECT_KEY || 'SUPPORT',
    };

    this.config = jiraConfigSchema.parse(fullConfig);
    
    // Initialize rate limiter (Jira Cloud allows 10 requests per second)
    this.rateLimiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 1000,
      retryAfter: 1000,
    });

    // Set up authentication headers
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    this.baseHeaders = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.rateLimiter.checkLimit();

    const url = `${this.config.baseUrl}/rest/api/3/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.baseHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Search for Jira issues using JQL
   */
  async searchIssues(params: {
    jql: string;
    startAt?: number;
    maxResults?: number;
    fields?: string[];
  }): Promise<JiraSearchResponse> {
    const searchParams = new URLSearchParams({
      jql: params.jql,
      startAt: (params.startAt || 0).toString(),
      maxResults: (params.maxResults || 50).toString(),
    });

    if (params.fields && params.fields.length > 0) {
      searchParams.append('fields', params.fields.join(','));
    }

    return this.makeRequest<JiraSearchResponse>(`search?${searchParams}`);
  }

  /**
   * Get a single Jira issue by key
   */
  async getIssue(issueKey: string, fields?: string[]): Promise<JiraIssue> {
    const searchParams = new URLSearchParams();
    if (fields && fields.length > 0) {
      searchParams.append('fields', fields.join(','));
    }

    const endpoint = `issue/${issueKey}${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.makeRequest<JiraIssue>(endpoint);
  }

  /**
   * Create a new Jira issue
   */
  async createIssue(params: {
    summary: string;
    description: string;
    issueType: string;
    priority?: string;
    assignee?: string;
    projectKey?: string;
    labels?: string[];
    customFields?: Record<string, any>;
  }): Promise<{ id: string; key: string; self: string }> {
    const projectKey = params.projectKey || this.config.projectKey;
    
    const issueData: any = {
      fields: {
        project: { key: projectKey },
        summary: params.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: params.description,
                },
              ],
            },
          ],
        },
        issuetype: { name: params.issueType },
      },
    };

    if (params.priority) {
      issueData.fields.priority = { name: params.priority };
    }

    if (params.assignee) {
      issueData.fields.assignee = { emailAddress: params.assignee };
    }

    if (params.labels && params.labels.length > 0) {
      issueData.fields.labels = params.labels;
    }

    // Add custom fields if provided
    if (params.customFields) {
      Object.assign(issueData.fields, params.customFields);
    }

    return this.makeRequest<{ id: string; key: string; self: string }>('issue', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  /**
   * Update an existing Jira issue
   */
  async updateIssue(
    issueKey: string,
    updates: {
      summary?: string;
      description?: string;
      priority?: string;
      assignee?: string;
      status?: string;
      customFields?: Record<string, any>;
    }
  ): Promise<void> {
    const updateData: any = { fields: {} };

    if (updates.summary) {
      updateData.fields.summary = updates.summary;
    }

    if (updates.description) {
      updateData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: updates.description,
              },
            ],
          },
        ],
      };
    }

    if (updates.priority) {
      updateData.fields.priority = { name: updates.priority };
    }

    if (updates.assignee) {
      updateData.fields.assignee = { emailAddress: updates.assignee };
    }

    // Add custom fields if provided
    if (updates.customFields) {
      Object.assign(updateData.fields, updates.customFields);
    }

    await this.makeRequest(`issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    // Handle status transition separately if needed
    if (updates.status) {
      await this.transitionIssue(issueKey, updates.status);
    }
  }

  /**
   * Transition an issue to a new status
   */
  async transitionIssue(issueKey: string, status: string): Promise<void> {
    // First, get available transitions
    const transitions = await this.makeRequest<{
      transitions: Array<{ id: string; name: string; to: { name: string } }>;
    }>(`issue/${issueKey}/transitions`);

    // Find the transition that leads to the desired status
    const transition = transitions.transitions.find(
      t => t.to.name.toLowerCase() === status.toLowerCase()
    );

    if (!transition) {
      throw new Error(`No transition found to status: ${status}`);
    }

    // Execute the transition
    await this.makeRequest(`issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: { id: transition.id },
      }),
    });
  }

  /**
   * Add a comment to an issue
   */
  async addComment(
    issueKey: string,
    comment: string,
    visibility?: { type: 'group' | 'role'; value: string }
  ): Promise<JiraComment> {
    const commentData: any = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: comment,
              },
            ],
          },
        ],
      },
    };

    if (visibility) {
      commentData.visibility = visibility;
    }

    return this.makeRequest<JiraComment>(`issue/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  }

  /**
   * Get comments for an issue
   */
  async getComments(issueKey: string): Promise<{ comments: JiraComment[] }> {
    return this.makeRequest<{ comments: JiraComment[] }>(`issue/${issueKey}/comment`);
  }

  /**
   * Search issues by text query (simplified JQL builder)
   */
  async searchByText(params: {
    text: string;
    projectKey?: string;
    status?: string[];
    assignee?: string;
    maxResults?: number;
  }): Promise<JiraSearchResponse> {
    const projectKey = params.projectKey || this.config.projectKey;
    let jql = `project = "${projectKey}" AND text ~ "${params.text}"`;

    if (params.status && params.status.length > 0) {
      const statusList = params.status.map(s => `"${s}"`).join(', ');
      jql += ` AND status IN (${statusList})`;
    }

    if (params.assignee) {
      jql += ` AND assignee = "${params.assignee}"`;
    }

    jql += ' ORDER BY updated DESC';

    return this.searchIssues({
      jql,
      maxResults: params.maxResults || 20,
    });
  }

  /**
   * Get project information
   */
  async getProject(projectKey?: string): Promise<{
    id: string;
    key: string;
    name: string;
    projectTypeKey: string;
  }> {
    const key = projectKey || this.config.projectKey;
    return this.makeRequest<{
      id: string;
      key: string;
      name: string;
      projectTypeKey: string;
    }>(`project/${key}`);
  }

  /**
   * Get issue types for a project
   */
  async getIssueTypes(projectKey?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    subtask: boolean;
  }>> {
    const key = projectKey || this.config.projectKey;
    const project = await this.getProject(key);
    return this.makeRequest<Array<{
      id: string;
      name: string;
      description: string;
      subtask: boolean;
    }>>(`project/${project.id}/statuses`);
  }

  /**
   * Validate configuration
   */
  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.makeRequest('myself');
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export a default instance
export const jiraClient = new JiraClient();