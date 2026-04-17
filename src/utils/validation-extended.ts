/**
 * Input Validation & Sanitization
 *
 * All user input from CLI, web, and MCP must be validated before use.
 * This prevents injection attacks, path traversal, and command injection.
 */

import { ValidationError } from './errors.js';

/**
 * Validate git commit message
 * - Max length: 72 chars for subject line
 * - No null bytes or special control characters
 * - Supports multiline body
 */
export function validateGitCommitMessage(message: string): {
  valid: boolean;
  errors: string[];
  sanitized: string;
} {
  const errors: string[] = [];
  let sanitized = message;

  // Empty check
  if (!message || message.trim().length === 0) {
    errors.push('Commit message cannot be empty');
    return { valid: false, errors, sanitized };
  }

  // Length check (subject line)
  const lines = message.split('\n');
  if (lines[0].length > 72) {
    errors.push(`Subject line must be ≤72 characters (got ${lines[0].length})`);
  }

  // Null bytes and control characters
  if (message.includes('\0')) {
    errors.push('Null bytes are not allowed');
  }

  // Control characters (except newlines and tabs)
  const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
  if (controlChars.test(message)) {
    errors.push('Control characters are not allowed');
    sanitized = message.replace(controlChars, '');
  }

  // Warn about suspicious patterns (but don't fail)
  if (message.includes('password') || message.includes('secret')) {
    errors.push('WARNING: Message contains sensitive keywords - ensure no secrets are included');
  }

  return {
    valid: errors.length === 0 || errors.every(e => e.startsWith('WARNING')),
    errors,
    sanitized,
  };
}

/**
 * Validate file path for safety
 * - No path traversal (../)
 * - No absolute paths
 * - No null bytes
 * - Only safe characters
 */
export function validateFilePath(filePath: string): {
  valid: boolean;
  errors: string[];
  normalized: string;
} {
  const errors: string[] = [];

  if (!filePath || filePath.length === 0) {
    errors.push('File path is empty');
    return { valid: false, errors, normalized: '' };
  }

  // No null bytes
  if (filePath.includes('\0')) {
    errors.push('Null bytes in path');
    return { valid: false, errors, normalized: '' };
  }

  // No path traversal
  if (filePath.includes('..')) {
    errors.push('Path traversal detected');
    return { valid: false, errors, normalized: '' };
  }

  // No absolute paths
  if (filePath.startsWith('/') || /^[a-z]:/i.test(filePath)) {
    errors.push('Absolute paths not allowed');
    return { valid: false, errors, normalized: '' };
  }

  // Normalize separators
  const normalized = filePath.replace(/\\/g, '/');

  // Only alphanumeric, /, -, _, ., @
  const validPattern = /^[a-zA-Z0-9.\/_@-]+$/;
  if (!validPattern.test(normalized)) {
    errors.push('Path contains invalid characters');
    return { valid: false, errors, normalized: '' };
  }

  return { valid: true, errors: [], normalized };
}

/**
 * Validate git branch name
 * - No spaces
 * - No special characters (ssh, html, xss vectors)
 */
export function validateBranchName(branchName: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!branchName || branchName.trim().length === 0) {
    errors.push('Branch name cannot be empty');
    return { valid: false, errors };
  }

  // Git naming rules
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(branchName)) {
    errors.push(
      'Branch name can only contain alphanumeric characters, dots, dashes, and underscores'
    );
  }

  // Reserved names
  const reserved = ['HEAD', 'FETCH_HEAD', 'MERGE_HEAD', 'CHERRY_PICK_HEAD'];
  if (reserved.includes(branchName.toUpperCase())) {
    errors.push(`"${branchName}" is a reserved branch name`);
  }

  // Check for paths-like patterns
  if (branchName.includes('..') || branchName.includes('//')) {
    errors.push('Invalid branch name pattern');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
    return { valid: false, errors };
  }

  // Simple email validation (RFC 5322 simplified)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    errors.push('Invalid email format');
  }

  // Length check
  if (email.length > 254) {
    errors.push('Email is too long (max 254 characters)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate API key format (must be alphanumeric token)
 */
export function validateAPIKey(key: string): {
  valid: boolean;
  errors: string[];
  masked: string;
} {
  const errors: string[] = [];

  if (!key || key.length === 0) {
    errors.push('API key is required');
    return { valid: false, errors, masked: '' };
  }

  // No spaces
  if (key.includes(' ') || key.includes('\n') || key.includes('\t')) {
    errors.push('API key contains invalid whitespace');
  }

  // Only alphanumeric and dash/underscore (typical token pattern)
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    errors.push('API key contains invalid characters');
  }

  // Length check
  if (key.length < 8) {
    errors.push('API key is too short (minimum 8 characters)');
  }
  if (key.length > 256) {
    errors.push('API key is too long (maximum 256 characters)');
  }

  const masked = key.substring(0, 3) + '*'.repeat(Math.max(0, key.length - 6)) + key.substring(key.length - 3);

  return { valid: errors.length === 0, errors, masked };
}

/**
 * Validate JSON input
 */
export function validateJSON(json: string): {
  valid: boolean;
  errors: string[];
  parsed?: unknown;
} {
  const errors: string[] = [];

  if (!json || json.trim().length === 0) {
    errors.push('JSON input is empty');
    return { valid: false, errors };
  }

  try {
    const parsed = JSON.parse(json);
    return { valid: true, errors: [], parsed };
  } catch (e) {
    if (e instanceof SyntaxError) {
      errors.push(`Invalid JSON: ${e.message}`);
    } else {
      errors.push('Failed to parse JSON');
    }
    return { valid: false, errors };
  }
}

/**
 * Sanitize string for safe console output (prevent ANSI injection)
 */
export function sanitizeConsoleOutput(str: string): string {
  if (typeof str !== 'string') {
    return String(str);
  }

  // Remove ANSI escape sequences (except allowed colors)
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * Sanitize filename (prevent directory traversal and special chars)
 */
export function sanitizeFilename(filename: string): {
  valid: boolean;
  errors: string[];
  sanitized: string;
} {
  const errors: string[] = [];

  if (!filename || filename.trim().length === 0) {
    errors.push('Filename cannot be empty');
    return { valid: false, errors, sanitized: '' };
  }

  // Remove directory separators
  let sanitized = filename.replace(/[\/\\]/g, '_');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F]/g, '');

  // Remove questionable characters for filesystem
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');

  // Limit length (most filesystems max 255)
  if (sanitized.length > 255) {
    errors.push('Filename too long');
    sanitized = sanitized.substring(0, 255);
  }

  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Helper to create validation error with context
 */
export function throwValidationError(
  message: string,
  context: Record<string, unknown> = {}
): never {
  throw new ValidationError(message, context);
}

/**
 * Batch validation with early exit
 */
export function validateMultiple<T extends Record<string, unknown>>(
  validators: Array<{
    field: string;
    value: unknown;
    validator: (value: unknown) => { valid: boolean; errors: string[] };
  }>
): { valid: boolean; errors: Record<string, string[]>; firstError?: string } {
  const errors: Record<string, string[]> = {};

  for (const { field, value, validator } of validators) {
    const result = validator(value);
    if (!result.valid) {
      errors[field] = result.errors;
      if (!errors[field].length) {
        return { valid: false, errors, firstError: `${field}: validation failed` };
      }
    }
  }

  const allValid = Object.keys(errors).length === 0;
  return {
    valid: allValid,
    errors,
    firstError: allValid ? undefined : `${Object.keys(errors)[0]}: ${errors[Object.keys(errors)[0]][0]}`,
  };
}
