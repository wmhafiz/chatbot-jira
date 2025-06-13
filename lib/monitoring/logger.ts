import { writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logDirectory: string;

  constructor() {
    this.logLevel = this.getLogLevelFromEnv();
    this.logDirectory = process.env.LOG_DIRECTORY || './logs';
    this.ensureLogDirectory();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      if (!existsSync(this.logDirectory)) {
        await mkdir(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const base = `[${entry.timestamp}] ${levelName}: ${entry.message}`;
    
    const metadata = [];
    if (entry.context) metadata.push(`context=${entry.context}`);
    if (entry.userId) metadata.push(`userId=${entry.userId}`);
    if (entry.sessionId) metadata.push(`sessionId=${entry.sessionId}`);
    if (entry.requestId) metadata.push(`requestId=${entry.requestId}`);
    
    const metadataStr = metadata.length > 0 ? ` [${metadata.join(', ')}]` : '';
    const extraData = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    const errorData = entry.error ? ` ERROR: ${entry.error.name}: ${entry.error.message}${entry.error.stack ? '\n' + entry.error.stack : ''}` : '';
    
    return base + metadataStr + extraData + errorData;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}.log`;
      const filepath = path.join(this.logDirectory, filename);
      const logLine = this.formatLogEntry(entry) + '\n';
      
      await appendFile(filepath, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
  }

  async log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, metadata, error);
    
    // Always log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const formatted = this.formatLogEntry(entry);
      switch (level) {
        case LogLevel.ERROR:
          console.error(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        default:
          console.log(formatted);
      }
    }

    // Write to file
    await this.writeToFile(entry);
  }

  async error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.ERROR, message, context, metadata, error);
  }

  async warn(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.WARN, message, context, metadata);
  }

  async info(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.INFO, message, context, metadata);
  }

  async debug(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.DEBUG, message, context, metadata);
  }

  // Request/Response logging
  async logRequest(
    method: string,
    url: string,
    userId?: string,
    sessionId?: string,
    requestId?: string,
    body?: any
  ): Promise<void> {
    await this.log(LogLevel.INFO, `${method} ${url}`, 'REQUEST', {
      userId,
      sessionId,
      requestId,
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string,
    sessionId?: string,
    requestId?: string
  ): Promise<void> {
    await this.log(LogLevel.INFO, `${method} ${url} - ${statusCode} (${duration}ms)`, 'RESPONSE', {
      userId,
      sessionId,
      requestId,
      statusCode,
      duration
    });
  }

  // Performance logging
  async logPerformance(
    operation: string,
    duration: number,
    context?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.INFO, `${operation} completed in ${duration}ms`, context || 'PERFORMANCE', {
      ...metadata,
      duration,
      operation
    });
  }

  // Security logging
  async logSecurity(
    event: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.WARN, `Security event: ${event}`, 'SECURITY', {
      ...metadata,
      userId,
      ip,
      userAgent,
      event
    });
  }

  // Business logic logging
  async logKBActivity(
    action: string,
    articleId?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.INFO, `KB Activity: ${action}`, 'KB', {
      ...metadata,
      action,
      articleId,
      userId
    });
  }

  async logJiraActivity(
    action: string,
    ticketKey?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.INFO, `Jira Activity: ${action}`, 'JIRA', {
      ...metadata,
      action,
      ticketKey,
      userId
    });
  }

  async logAIActivity(
    action: string,
    model?: string,
    tokens?: number,
    duration?: number,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.INFO, `AI Activity: ${action}`, 'AI', {
      ...metadata,
      action,
      model,
      tokens,
      duration,
      userId
    });
  }
}

export const logger = Logger.getInstance();