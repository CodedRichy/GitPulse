/**
 * Web API logging utilities
 * Simple structured logging for Next.js API routes
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  endpoint?: string;
  userId?: string;
  ip?: string;
  durationMs?: number;
  [key: string]: any;
}

class WebLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, ctx?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = ctx ? ` ${JSON.stringify(ctx)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | string, context?: LogContext) {
    const errorMsg = error instanceof Error ? error.message : error;
    console.error(this.formatMessage('error', message, { error: errorMsg, ...context }));
  }

  /**
   * Log API request/response cycle
   */
  logRequest(
    method: string,
    endpoint: string,
    context: LogContext = {}
  ) {
    this.info(`API Request: ${method} ${endpoint}`, {
      endpoint,
      ...context,
    });
  }

  /**
   * Log API response with timing
   */
  logResponse(
    status: number,
    endpoint: string,
    durationMs: number,
    context: LogContext = {}
  ) {
    const level = status >= 400 ? 'warn' : 'info';
    const message = `API Response: ${status} ${endpoint} (${durationMs}ms)`;
    
    if (level === 'warn') {
      this.warn(message, { endpoint, status, durationMs, ...context });
    } else {
      this.info(message, { endpoint, status, durationMs, ...context });
    }
  }

  /**
   * Log security-related events
   */
  logSecurity(message: string, context?: LogContext) {
    this.warn(`[SECURITY] ${message}`, context);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, durationMs: number, context?: LogContext) {
    const level = durationMs > 1000 ? 'warn' : 'info';
    const message = `Performance: ${operation} took ${durationMs}ms`;
    
    if (level === 'warn') {
      this.warn(message, context);
    } else {
      this.debug(message, context);
    }
  }
}

/**
 * Pre-configured loggers for common API endpoints
 */
export const apiLoggers = {
  auth: new WebLogger('auth'),
  session: new WebLogger('session'),
  settings: new WebLogger('settings'),
  user: new WebLogger('user'),
  account: new WebLogger('account'),
  health: new WebLogger('health'),
  support: new WebLogger('support'),
  api: new WebLogger('api'),
};

/**
 * Get or create logger for custom context
 */
export function getApiLogger(context: string): WebLogger {
  return new WebLogger(context);
}

export default WebLogger;
