/**
 * GitPulse Error Handling System
 *
 * Provides structured error classes with context, recovery suggestions,
 * and proper logging integration.
 */

export class GitPulseError extends Error {
  /**
   * @param code - Unique error code for tracking (e.g., 'GIT_NOT_REPO')
   * @param message - User-friendly error message
   * @param context - Additional context for debugging
   * @param recoveryAction - Suggestion for how to fix the issue
   */
  constructor(
    public code: string,
    message: string,
    public context: Record<string, unknown> = {},
    public recoveryAction?: string
  ) {
    super(message);
    this.name = 'GitPulseError';
    Object.setPrototypeOf(this, GitPulseError.prototype);
  }

  /**
   * Format error for display to user
   */
  toUserMessage(): string {
    let msg = `❌ ${this.message}`;
    if (this.recoveryAction) {
      msg += `\n→ ${this.recoveryAction}`;
    }
    return msg;
  }

  /**
   * Format error for logging
   */
  toLog(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Git operations errors
 */
export class GitError extends GitPulseError {
  constructor(
    message: string,
    context: {
      command?: string;
      path?: string;
      code?: number;
      stdout?: string;
      stderr?: string;
    } = {}
  ) {
    let recoveryAction: string | undefined;

    if (message.includes('not a git repository')) {
      recoveryAction = 'Run `git init` first or navigate to a git-tracked directory';
    } else if (message.includes('Permission denied')) {
      recoveryAction = 'Check file permissions or run with appropriate privileges';
    } else if (message.includes('merge conflict')) {
      recoveryAction = 'Resolve merge conflicts manually and try again';
    }

    super('GIT_ERROR', message, context, recoveryAction);
    Object.setPrototypeOf(this, GitError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends GitPulseError {
  constructor(
    message: string,
    context: {
      configFile?: string;
      validValues?: string[];
      receivedValue?: string;
    } = {}
  ) {
    const recoveryAction = context.configFile
      ? `Check your configuration in ${context.configFile}`
      : 'Check your GitPulse configuration';

    super('CONFIG_ERROR', message, context, recoveryAction);
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends GitPulseError {
  constructor(
    message: string,
    context: {
      field?: string;
      value?: unknown;
      reason?: string;
      expectedFormat?: string;
    } = {}
  ) {
    super('VALIDATION_ERROR', message, context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * AI/LLM provider errors
 */
export class AIError extends GitPulseError {
  constructor(
    message: string,
    context: {
      provider?: string;
      model?: string;
      requestId?: string;
      statusCode?: number;
    } = {}
  ) {
    let recoveryAction: string | undefined;

    if (context.statusCode === 429) {
      recoveryAction = 'Rate limited. Please wait a moment and try again.';
    } else if (context.statusCode === 401 || context.statusCode === 403) {
      recoveryAction = 'Check your API credentials are correct and have necessary permissions';
    } else if (context.statusCode === 503) {
      recoveryAction = `${context.provider} service is temporarily unavailable. Try again shortly.`;
    }

    super('AI_ERROR', message, context, recoveryAction);
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

/**
 * Security/Authentication errors
 */
export class SecurityError extends GitPulseError {
  constructor(
    message: string,
    context: {
      reason?: string;
      severity?: 'info' | 'warning' | 'critical';
      action?: string;
    } = {}
  ) {
    super('SECURITY_ERROR', message, context);
    Object.setPrototypeOf(this, SecurityError.prototype);
  }
}

/**
 * MCP/RPC protocol errors
 */
export class ProtocolError extends GitPulseError {
  constructor(
    message: string,
    context: {
      methodName?: string;
      requestId?: string;
      protocolVersion?: string;
    } = {}
  ) {
    super('PROTOCOL_ERROR', message, context);
    Object.setPrototypeOf(this, ProtocolError.prototype);
  }
}

/**
 * Quality gates specific errors
 */
export class QualityGateError extends GitPulseError {
  constructor(
    message: string,
    context: {
      gateName?: string;
      filePath?: string;
      lineNumber?: number;
      severity?: 'critical' | 'high' | 'medium' | 'low';
    } = {}
  ) {
    super('QUALITY_GATE_ERROR', message, context);
    Object.setPrototypeOf(this, QualityGateError.prototype);
  }
}

/**
 * Type guard to check if error is a GitPulseError
 */
export function isGitPulseError(error: unknown): error is GitPulseError {
  return error instanceof GitPulseError;
}

/**
 * Helper to wrap unknown errors
 */
export function toGitPulseError(error: unknown, defaultMessage = 'Unknown error'): GitPulseError {
  if (isGitPulseError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new GitPulseError(
      'UNKNOWN_ERROR',
      error.message || defaultMessage,
      { originalStack: error.stack },
      'Enable debug logs for more information'
    );
  }

  return new GitPulseError(
    'UNKNOWN_ERROR',
    String(error) || defaultMessage,
    { raw: String(error) },
    'Enable debug logs for more information'
  );
}
