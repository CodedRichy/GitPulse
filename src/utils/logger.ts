import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * GitPulse structured logging system
 * 
 * Logs to:
 * - .gitpulse/gitpulse.log (all levels)
 * - .gitpulse/error.log (errors only)
 * - console (development only)
 * 
 * Levels: ERROR, WARN, INFO, DEBUG (ordered by severity)
 */

const LOG_DIR = path.join(os.homedir(), '.gitpulse');
const LOG_FILE = path.join(LOG_DIR, 'gitpulse.log');
const ERROR_FILE = path.join(LOG_DIR, 'error.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Custom log format for structured output
 * Includes timestamp, level, context, message, and metadata
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf((info: winston.Logform.TransformableInfo) => {
    const { timestamp, level, message, context, stack, ...meta } = info as winston.Logform.TransformableInfo & { timestamp?: string; context?: string; stack?: string };
    const base = `[${timestamp}] [${level.toUpperCase()}]`;
    const ctx = context ? ` [${context}]` : '';
    const msg = `${base}${ctx} ${message}`;

    // Include stack trace for errors
    if (stack) {
      return `${msg}\n${stack}`;
    }

    // Include metadata if present
    if (Object.keys(meta).length > 0) {
      return `${msg} ${JSON.stringify(meta)}`;
    }

    return msg;
  })
);

/**
 * Console format for development (less verbose)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf((info: winston.Logform.TransformableInfo) => {
    const { timestamp, level, message, context } = info as winston.Logform.TransformableInfo & { timestamp?: string; context?: string };
    const ctx = context ? `[${context}] ` : '';
    return `${timestamp} ${level} ${ctx}${message}`;
  })
);

// Create base logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {},
  transports: [
    // All logs to combined file
    new winston.transports.File({
      filename: LOG_FILE,
      maxsize: 10485760, // 10MB
      maxFiles: 5, // Keep 5 files, ~50MB total
    }),
    // Errors only to error file
    new winston.transports.File({
      filename: ERROR_FILE,
      level: 'error',
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

/**
 * Contextual logger wrapper
 * Adds context to all logs within a namespace
 */
export class ContextualLogger {
  constructor(private context: string) {}

  debug(message: string, meta?: Record<string, any>) {
    logger.debug(message, { context: this.context, ...meta });
  }

  info(message: string, meta?: Record<string, any>) {
    logger.info(message, { context: this.context, ...meta });
  }

  warn(message: string, meta?: Record<string, any>) {
    logger.warn(message, { context: this.context, ...meta });
  }

  error(message: string, error?: Error | string, meta?: Record<string, any>) {
    if (error instanceof Error) {
      logger.error(message, {
        context: this.context,
        error: error.message,
        stack: error.stack,
        ...meta,
      });
    } else {
      logger.error(message, { context: this.context, error, ...meta });
    }
  }

  /**
   * Log operation timing (performance tracking)
   */
  time(label: string, durationMs: number, meta?: Record<string, any>) {
    this.info(`${label} completed in ${durationMs}ms`, meta);
  }

  /**
   * Log security-related events
   */
  security(message: string, meta?: Record<string, any>) {
    logger.warn(message, {
      context: this.context,
      severity: 'SECURITY',
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }
}

/**
 * Export ready-to-use loggers for common modules
 */
export const loggers = {
  git: new ContextualLogger('git'),
  auth: new ContextualLogger('auth'),
  api: new ContextualLogger('api'),
  mcp: new ContextualLogger('mcp'),
  config: new ContextualLogger('config'),
  validation: new ContextualLogger('validation'),
  audit: new ContextualLogger('audit'),
  ai: new ContextualLogger('ai'),
  command: new ContextualLogger('command'),
  performance: new ContextualLogger('performance'),
};

/**
 * Get or create logger for custom context
 */
export function getLogger(context: string): ContextualLogger {
  return new ContextualLogger(context);
}

/**
 * Export base winston instance for advanced usage
 */
export default logger;
