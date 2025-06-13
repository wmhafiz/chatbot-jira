'use server';

import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { jiraClient } from '@/lib/integrations/jira';
import {
  createJiraTicket,
  updateJiraTicket,
  getJiraTickets,
  getJiraTicketById,
  getJiraTicketByIssueKey,
  searchJiraTickets,
  createKbJiraLink,
  getKbJiraLinks,
  deleteKbJiraLink,
  createJiraTicketSync,
  updateJiraTicketSync,
  getJiraTicketSync,
  getTicketsNeedingSync,
} from '@/lib/db/kb-queries';
import { searchKbEntries } from '@/lib/actions/kb';
import { ChatSDKError } from '@/lib/errors';
import { createHash } from 'crypto';

// Zod schemas for input validation
const searchJiraTicketsSchema = z.object({
  query: z.string().optional(),
  jql: z.string().optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  projectKey: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(20),
  startAt: z.number().min(0).default(0),
});

const createJiraTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  issueType: z.string().default('Task'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  assignee: z.string().optional(),
  projectKey: z.string().optional(),
  labels: z.array(z.string()).optional(),
  chatId: z.string().optional(),
  linkKbEntries: z.boolean().default(true),
  customFields: z.record(z.any()).optional(),
});

const updateJiraTicketSchema = z.object({
  id: z.string().uuid('Invalid ticket ID'),
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  assignee: z.string().optional(),
  status: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

const addJiraCommentSchema = z.object({
  issueKey: z.string().min(1, 'Issue key is required'),
  comment: z.string().min(1, 'Comment is required'),
  visibility: z.object({
    type: z.enum(['group', 'role']),
    value: z.string(),
  }).optional(),
});

const linkKbToJiraSchema = z.object({
  kbArticleId: z.string().uuid('Invalid KB article ID'),
  jiraTicketId: z.string().uuid('Invalid Jira ticket ID'),
  linkType: z.enum(['related', 'resolves', 'references']).default('related'),
});

// Response type for consistent error handling
type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Search Jira tickets using JQL or simple text search
 */
export async function searchJiraTicketsAction(
  params: z.infer<typeof searchJiraTicketsSchema>
): Promise<ActionResponse<any[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedParams = searchJiraTicketsSchema.parse(params);

    let results: any[] = [];

    if (validatedParams.jql) {
      // Use custom JQL query
      const jiraResults = await jiraClient.searchIssues({
        jql: validatedParams.jql,
        startAt: validatedParams.startAt,
        maxResults: validatedParams.maxResults,
      });
      results = jiraResults.issues;
    } else if (validatedParams.query) {
      // Use text search
      const jiraResults = await jiraClient.searchByText({
        text: validatedParams.query,
        projectKey: validatedParams.projectKey,
        status: validatedParams.status,
        assignee: validatedParams.assignee,
        maxResults: validatedParams.maxResults,
      });
      results = jiraResults.issues;
    } else {
      // Search local database
      const localResults = await searchJiraTickets({
        query: validatedParams.query,
        status: validatedParams.status,
        priority: validatedParams.priority,
        assignee: validatedParams.assignee,
        userId: session.user.id,
        limit: validatedParams.maxResults,
      });
      results = localResults;
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Error searching Jira tickets:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    return { success: false, error: 'Failed to search Jira tickets' };
  }
}

/**
 * Get a single Jira ticket by ID or issue key
 */
export async function getJiraTicketAction(
  identifier: string,
  isIssueKey = false
): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    let ticket;
    if (isIssueKey) {
      // Try to get from local database first
      ticket = await getJiraTicketByIssueKey({ issueKey: identifier });
      
      if (!ticket) {
        // Fetch from Jira API and sync to local database
        const jiraTicket = await jiraClient.getIssue(identifier);
        ticket = await syncJiraTicketToLocal(jiraTicket, session.user.id);
      }
    } else {
      if (!z.string().uuid().safeParse(identifier).success) {
        return { success: false, error: 'Invalid ticket ID' };
      }
      ticket = await getJiraTicketById({ id: identifier });
    }

    if (!ticket) {
      return { success: false, error: 'Jira ticket not found' };
    }

    // Get linked KB entries
    const linkedKbEntries = await getKbJiraLinks({ jiraTicketId: ticket.id });

    return {
      success: true,
      data: {
        ...ticket,
        linkedKbEntries,
      },
    };
  } catch (error) {
    console.error('Error getting Jira ticket:', error);
    return { success: false, error: 'Failed to get Jira ticket' };
  }
}

/**
 * Create a new Jira ticket
 */
export async function createJiraTicketAction(
  data: z.infer<typeof createJiraTicketSchema>
): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = createJiraTicketSchema.parse(data);

    // Create ticket in Jira
    const jiraResult = await jiraClient.createIssue({
      summary: validatedData.title,
      description: validatedData.description,
      issueType: validatedData.issueType,
      priority: validatedData.priority,
      assignee: validatedData.assignee,
      projectKey: validatedData.projectKey,
      labels: validatedData.labels,
      customFields: validatedData.customFields,
    });

    // Create ticket in local database
    const [localTicket] = await createJiraTicket({
      issueKey: jiraResult.key,
      title: validatedData.title,
      description: validatedData.description,
      status: 'Open',
      priority: validatedData.priority,
      assignee: validatedData.assignee,
      reporter: session.user.email || session.user.name || 'Unknown',
      userId: session.user.id,
      chatId: validatedData.chatId,
    });

    // Create sync record
    await createJiraTicketSync({
      ticketId: localTicket.id,
      syncStatus: 'success',
      jiraUpdatedAt: new Date(),
      fieldsHash: generateTicketHash(localTicket),
    });

    let linkedKbEntries: any[] = [];

    // Find and link related KB entries if requested
    if (validatedData.linkKbEntries) {
      try {
        const searchResult = await searchKbEntries({
          query: `${validatedData.title} ${validatedData.description}`,
          useVector: true,
          limit: 3,
          similarityThreshold: 0.6,
        });

        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          for (const kbEntry of searchResult.data) {
            try {
              await createKbJiraLink({
                kbArticleId: kbEntry.id,
                jiraTicketId: localTicket.id,
                linkType: 'related',
                createdBy: session.user.id,
              });
              linkedKbEntries.push({
                id: kbEntry.id,
                title: kbEntry.title,
                category: kbEntry.categoryName || 'Uncategorized',
                similarity: 'similarity' in kbEntry ? kbEntry.similarity : undefined,
              });
            } catch (linkError) {
              console.warn('Failed to create KB-Jira link:', linkError);
            }
          }
        }
      } catch (kbError) {
        console.warn('Failed to find related KB entries:', kbError);
      }
    }

    return {
      success: true,
      data: {
        ...localTicket,
        jiraUrl: `${process.env.JIRA_BASE_URL}/browse/${jiraResult.key}`,
        linkedKbEntries: linkedKbEntries.length > 0 ? linkedKbEntries : undefined,
      },
    };
  } catch (error) {
    console.error('Error creating Jira ticket:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create Jira ticket' };
  }
}

/**
 * Update an existing Jira ticket
 */
export async function updateJiraTicketAction(
  data: z.infer<typeof updateJiraTicketSchema>
): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = updateJiraTicketSchema.parse(data);

    // Get existing ticket
    const existingTicket = await getJiraTicketById({ id: validatedData.id });
    if (!existingTicket) {
      return { success: false, error: 'Jira ticket not found' };
    }

    if (existingTicket.userId !== session.user.id) {
      return { success: false, error: 'Unauthorized to update this ticket' };
    }

    // Update ticket in Jira
    await jiraClient.updateIssue(existingTicket.issueKey, {
      summary: validatedData.title,
      description: validatedData.description,
      priority: validatedData.priority,
      assignee: validatedData.assignee,
      status: validatedData.status,
      customFields: validatedData.customFields,
    });

    // Update ticket in local database
    const [updatedTicket] = await updateJiraTicket({
      id: validatedData.id,
      status: validatedData.status,
      priority: validatedData.priority,
      assignee: validatedData.assignee,
    });

    // Update sync record
    await updateJiraTicketSync({
      ticketId: validatedData.id,
      syncStatus: 'success',
      jiraUpdatedAt: new Date(),
      fieldsHash: generateTicketHash(updatedTicket),
    });

    return { success: true, data: updatedTicket };
  } catch (error) {
    console.error('Error updating Jira ticket:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update Jira ticket' };
  }
}

/**
 * Add a comment to a Jira ticket
 */
export async function addJiraCommentAction(
  data: z.infer<typeof addJiraCommentSchema>
): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = addJiraCommentSchema.parse(data);

    const comment = await jiraClient.addComment(
      validatedData.issueKey,
      validatedData.comment,
      validatedData.visibility
    );

    return { success: true, data: comment };
  } catch (error) {
    console.error('Error adding Jira comment:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    return { success: false, error: 'Failed to add comment to Jira ticket' };
  }
}

/**
 * Link a KB entry to a Jira ticket
 */
export async function linkKbToJiraAction(
  data: z.infer<typeof linkKbToJiraSchema>
): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = linkKbToJiraSchema.parse(data);

    const [link] = await createKbJiraLink({
      kbArticleId: validatedData.kbArticleId,
      jiraTicketId: validatedData.jiraTicketId,
      linkType: validatedData.linkType,
      createdBy: session.user.id,
    });

    return { success: true, data: link };
  } catch (error) {
    console.error('Error linking KB to Jira:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to link KB entry to Jira ticket' };
  }
}

/**
 * Remove a link between KB entry and Jira ticket
 */
export async function unlinkKbFromJiraAction(
  kbArticleId: string,
  jiraTicketId: string
): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!z.string().uuid().safeParse(kbArticleId).success) {
      return { success: false, error: 'Invalid KB article ID' };
    }

    if (!z.string().uuid().safeParse(jiraTicketId).success) {
      return { success: false, error: 'Invalid Jira ticket ID' };
    }

    const [deletedLink] = await deleteKbJiraLink({
      kbArticleId,
      jiraTicketId,
    });

    return { success: true, data: deletedLink };
  } catch (error) {
    console.error('Error unlinking KB from Jira:', error);
    if (error instanceof ChatSDKError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to unlink KB entry from Jira ticket' };
  }
}

/**
 * Sync Jira tickets from Jira API to local database
 */
export async function syncJiraTicketsAction(): Promise<ActionResponse<{ synced: number; errors: number }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const ticketsToSync = await getTicketsNeedingSync({ limit: 50 });
    let synced = 0;
    let errors = 0;

    for (const ticketInfo of ticketsToSync) {
      try {
        const jiraTicket = await jiraClient.getIssue(ticketInfo.issueKey);
        await syncJiraTicketToLocal(jiraTicket, session.user.id);
        synced++;
      } catch (error) {
        console.error(`Failed to sync ticket ${ticketInfo.issueKey}:`, error);
        await updateJiraTicketSync({
          ticketId: ticketInfo.ticketId,
          syncStatus: 'failed',
          syncError: error instanceof Error ? error.message : 'Unknown error',
        });
        errors++;
      }
    }

    return {
      success: true,
      data: { synced, errors },
    };
  } catch (error) {
    console.error('Error syncing Jira tickets:', error);
    return { success: false, error: 'Failed to sync Jira tickets' };
  }
}

/**
 * Get KB-Jira links for a specific KB article or Jira ticket
 */
export async function getKbJiraLinksAction(params: {
  kbArticleId?: string;
  jiraTicketId?: string;
}): Promise<ActionResponse<any[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const links = await getKbJiraLinks(params);
    return { success: true, data: links };
  } catch (error) {
    console.error('Error getting KB-Jira links:', error);
    return { success: false, error: 'Failed to get KB-Jira links' };
  }
}

// Helper functions
async function syncJiraTicketToLocal(jiraTicket: any, userId: string) {
  const existingTicket = await getJiraTicketByIssueKey({ issueKey: jiraTicket.key });
  
  if (existingTicket) {
    // Update existing ticket
    const [updatedTicket] = await updateJiraTicket({
      id: existingTicket.id,
      status: jiraTicket.fields.status.name,
      priority: jiraTicket.fields.priority.name,
      assignee: jiraTicket.fields.assignee?.emailAddress,
    });

    await updateJiraTicketSync({
      ticketId: existingTicket.id,
      syncStatus: 'success',
      jiraUpdatedAt: new Date(jiraTicket.fields.updated),
      fieldsHash: generateTicketHash(updatedTicket),
    });

    return updatedTicket;
  } else {
    // Create new ticket
    const [newTicket] = await createJiraTicket({
      issueKey: jiraTicket.key,
      title: jiraTicket.fields.summary,
      description: jiraTicket.fields.description || '',
      status: jiraTicket.fields.status.name,
      priority: jiraTicket.fields.priority.name,
      assignee: jiraTicket.fields.assignee?.emailAddress,
      reporter: jiraTicket.fields.reporter.emailAddress,
      userId,
    });

    await createJiraTicketSync({
      ticketId: newTicket.id,
      syncStatus: 'success',
      jiraUpdatedAt: new Date(jiraTicket.fields.updated),
      fieldsHash: generateTicketHash(newTicket),
    });

    return newTicket;
  }
}

function generateTicketHash(ticket: any): string {
  const hashData = `${ticket.title}|${ticket.description}|${ticket.status}|${ticket.priority}|${ticket.assignee || ''}`;
  return createHash('sha256').update(hashData).digest('hex');
}