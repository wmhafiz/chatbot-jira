import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { jiraTicket, jiraTicketSync } from '../db/kb-schema';
import { JiraClient } from '../integrations/jira';
import { cache } from '../cache/manager';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface JiraSyncJobData {
  ticketKey?: string; // Sync specific ticket
  projectKey?: string; // Sync all tickets in project
  fullSync?: boolean; // Full sync of all tickets
}

export class JiraSyncJob {
  static async process(data: JiraSyncJobData): Promise<void> {
    console.log('Processing Jira sync job:', data);

    try {
      const jiraClient = new JiraClient();
      
      if (data.ticketKey) {
        await this.syncSingleTicket(jiraClient, data.ticketKey);
      } else if (data.projectKey) {
        await this.syncProjectTickets(jiraClient, data.projectKey);
      } else if (data.fullSync) {
        await this.syncAllTickets(jiraClient);
      }

      console.log('Jira sync job completed successfully');
    } catch (error) {
      console.error('Jira sync job failed:', error);
      throw error;
    }
  }

  private static async syncSingleTicket(jiraClient: any, ticketKey: string): Promise<void> {
    try {
      const jiraIssue = await jiraClient.getIssue(ticketKey);
      await this.updateTicketInDatabase(jiraIssue);
      
      // Invalidate cache
      await cache.del(`jira_ticket:${ticketKey}`);
      
      console.log(`Synced ticket: ${ticketKey}`);
    } catch (error) {
      console.error(`Failed to sync ticket ${ticketKey}:`, error);
      throw error;
    }
  }

  private static async syncProjectTickets(jiraClient: any, projectKey: string): Promise<void> {
    try {
      const jql = `project = ${projectKey} ORDER BY updated DESC`;
      const searchResults = await jiraClient.searchJira(jql, {
        maxResults: 100,
        fields: ['summary', 'description', 'status', 'priority', 'assignee', 'reporter', 'created', 'updated']
      });

      for (const issue of searchResults.issues) {
        await this.updateTicketInDatabase(issue);
      }

      // Invalidate project cache
      await cache.delPattern(`jira_*:*${projectKey}*`);
      
      console.log(`Synced ${searchResults.issues.length} tickets for project: ${projectKey}`);
    } catch (error) {
      console.error(`Failed to sync project ${projectKey}:`, error);
      throw error;
    }
  }

  private static async syncAllTickets(jiraClient: any): Promise<void> {
    try {
      // Get all tickets updated in the last 24 hours
      const jql = 'updated >= -24h ORDER BY updated DESC';
      const searchResults = await jiraClient.searchJira(jql, {
        maxResults: 500,
        fields: ['summary', 'description', 'status', 'priority', 'assignee', 'reporter', 'created', 'updated']
      });

      for (const issue of searchResults.issues) {
        await this.updateTicketInDatabase(issue);
      }

      // Invalidate all Jira cache
      await cache.invalidateJiraCache();
      
      console.log(`Full sync completed: ${searchResults.issues.length} tickets updated`);
    } catch (error) {
      console.error('Failed to perform full sync:', error);
      throw error;
    }
  }

  private static async updateTicketInDatabase(jiraIssue: any): Promise<void> {
    const ticketData = {
      issueKey: jiraIssue.key,
      title: jiraIssue.fields.summary,
      description: jiraIssue.fields.description || '',
      status: jiraIssue.fields.status.name,
      priority: jiraIssue.fields.priority?.name || 'Medium',
      assignee: jiraIssue.fields.assignee?.displayName || null,
      reporter: jiraIssue.fields.reporter?.displayName || null,
      updatedAt: new Date(jiraIssue.fields.updated),
    };

    // Check if ticket exists
    const existingTicket = await db
      .select()
      .from(jiraTicket)
      .where(eq(jiraTicket.issueKey, jiraIssue.key))
      .limit(1);

    if (existingTicket.length > 0) {
      // Update existing ticket
      await db
        .update(jiraTicket)
        .set(ticketData)
        .where(eq(jiraTicket.issueKey, jiraIssue.key));
    } else {
      // Create new ticket (this would need a userId, so we'll skip for now)
      console.log(`Skipping creation of new ticket ${jiraIssue.key} - no user context`);
    }

    // Update sync metadata
    const fieldsHash = this.generateFieldsHash(ticketData);
    
    const existingSync = await db
      .select()
      .from(jiraTicketSync)
      .innerJoin(jiraTicket, eq(jiraTicketSync.ticketId, jiraTicket.id))
      .where(eq(jiraTicket.issueKey, jiraIssue.key))
      .limit(1);

    if (existingSync.length > 0) {
      await db
        .update(jiraTicketSync)
        .set({
          lastSyncAt: new Date(),
          syncStatus: 'success',
          syncError: null,
          jiraUpdatedAt: new Date(jiraIssue.fields.updated),
          fieldsHash,
          updatedAt: new Date()
        })
        .where(eq(jiraTicketSync.id, existingSync[0].JiraTicketSync.id));
    }
  }

  private static generateFieldsHash(ticketData: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(ticketData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  static async scheduleSync(data: JiraSyncJobData, delay = 0): Promise<string> {
    const { jobQueue } = await import('./queue');
    return jobQueue.addJob('jira_sync', data, { 
      priority: 1, 
      delay,
      maxAttempts: 3 
    });
  }

  static async schedulePeriodicSync(): Promise<void> {
    // Schedule full sync every 6 hours
    const { jobQueue } = await import('./queue');
    await jobQueue.addJob('jira_sync', { fullSync: true }, {
      priority: 0,
      delay: 6 * 60 * 60 * 1000, // 6 hours
      maxAttempts: 2
    });
  }
}