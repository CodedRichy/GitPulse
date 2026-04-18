/**
 * Path Security Utilities
 *
 * Centralized path validation to prevent path traversal and directory escape attacks.
 * All MCP tools and file operations should use these utilities to validate paths.
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Result of path validation
 */
export interface PathValidationResult {
  valid: boolean;
  resolvedPath: string;
  error?: string;
}

/**
 * Maximum allowed path length to prevent DoS
 */
const MAX_PATH_LENGTH = 4096;

/**
 * Suspicious path patterns that indicate path traversal attempts
 */
const SUSPICIOUS_PATTERNS = [
  /\.\.[/\\]/,  // ../ or ..\
  /[/\\]\.\.[/\\]?/,  // /../ or \..\
  /%2e%2e/i,  // URL-encoded ..
  /\x2e\x2e/,  // Hex-encoded ..
  /^~/,  // Home directory expansion
  /\$\{.*\}/,  // Shell variable expansion
  /`/  // Command substitution
];

/**
 * Validates that a repository path is safe to use.
 *
 * Security checks:
 * 1. Path must be within allowed base directories (CWD, home, or temp)
 * 2. Path must not contain path traversal sequences
 * 3. Path must not be overly long (DoS prevention)
 * 4. Path must not contain shell metacharacters
 *
 * @param repoPath - The repository path to validate
 * @param allowedBases - Optional array of allowed base directories (defaults to CWD, home, temp)
 * @returns PathValidationResult with validation status and resolved path
 */
export function validateRepoPath(
  repoPath: string,
  allowedBases?: string[]
): PathValidationResult {
  // Check for empty or invalid input
  if (!repoPath || typeof repoPath !== 'string') {
    return {
      valid: false,
      resolvedPath: '',
      error: 'Repository path is required'
    };
  }

  // Check path length
  if (repoPath.length > MAX_PATH_LENGTH) {
    return {
      valid: false,
      resolvedPath: '',
      error: 'Path exceeds maximum allowed length'
    };
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(repoPath)) {
      return {
        valid: false,
        resolvedPath: '',
        error: 'Path contains suspicious characters or patterns'
      };
    }
  }

  // Resolve the path to absolute
  let resolvedPath: string;
  try {
    resolvedPath = path.resolve(repoPath);
  } catch {
    return {
      valid: false,
      resolvedPath: '',
      error: 'Failed to resolve path'
    };
  }

  // Check for path length after resolution
  if (resolvedPath.length > MAX_PATH_LENGTH) {
    return {
      valid: false,
      resolvedPath: '',
      error: 'Resolved path exceeds maximum allowed length'
    };
  }

  // Determine allowed base directories
  const bases = allowedBases || getDefaultAllowedBases();

  // Check that resolved path is within one of the allowed bases
  const isWithinAllowedBase = bases.some(base => {
    const relative = path.relative(base, resolvedPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  });

  if (!isWithinAllowedBase) {
    return {
      valid: false,
      resolvedPath: '',
      error: 'Path is outside of allowed directories'
    };
  }

  return {
    valid: true,
    resolvedPath,
    error: undefined
  };
}

/**
 * Gets the default list of allowed base directories.
 * These are considered "safe" locations for repositories.
 */
function getDefaultAllowedBases(): string[] {
  const bases: string[] = [];

  // Current working directory
  try {
    bases.push(process.cwd());
  } catch { /* ignore */ }

  // Home directory
  try {
    const homeDir = require('os').homedir();
    if (homeDir) {
      bases.push(homeDir);
    }
  } catch { /* ignore */ }

  // Temp directory (for test repos)
  try {
    const tmpDir = require('os').tmpdir();
    if (tmpDir) {
      bases.push(tmpDir);
    }
  } catch { /* ignore */ }

  // Common development directories
  const commonDirs = [
    'C:\\dev',
    'C:\\projects',
    'C:\\work',
    'C:\\Users',
    '/dev',
    '/projects',
    '/work',
    '/home',
    '/Users',
    '/tmp',
    '/var/tmp'
  ];

  for (const dir of commonDirs) {
    if (!bases.includes(dir)) {
      bases.push(dir);
    }
  }

  return bases;
}

/**
 * Validates that a file path is within a specific repository root.
 * This is a stricter check for file-specific operations.
 *
 * @param filePath - The file path to check
 * @param repoRoot - The repository root that must contain the file
 * @returns boolean indicating if file is within repo
 */
export function isPathWithinRepo(filePath: string, repoRoot: string): boolean {
  const resolvedFile = path.resolve(filePath);
  const resolvedRepo = path.resolve(repoRoot);
  const relative = path.relative(resolvedRepo, resolvedFile);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Sanitizes a path component to remove dangerous characters.
 * Use this when constructing paths from user input.
 *
 * @param component - Path component to sanitize
 * @returns Sanitized component
 */
export function sanitizePathComponent(component: string): string {
  // Remove null bytes
  let sanitized = component.replace(/\0/g, '');

  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '_');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f-\x9f]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Prevent special filenames (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  const upper = sanitized.toUpperCase();
  const baseName = upper.split('.')[0];
  if (reservedNames.includes(baseName)) {
    sanitized = `_${sanitized}`;
  }

  return sanitized;
}

/**
 * Validates and sanitizes a config path for gitleaks or other external tools.
 *
 * @param configPath - The config file path
 * @param repoRoot - The repository root for context
 * @returns PathValidationResult
 */
export function validateConfigPath(
  configPath: string,
  repoRoot: string
): PathValidationResult {
  // First validate the config path format
  if (!configPath || typeof configPath !== 'string') {
    return {
      valid: false,
      resolvedPath: '',
      error: 'Config path is required'
    };
  }

  // Resolve the path
  let resolvedPath: string;
  try {
    resolvedPath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(repoRoot, configPath);
  } catch {
    return {
      valid: false,
      resolvedPath: '',
      error: 'Failed to resolve config path'
    };
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(configPath)) {
      return {
        valid: false,
        resolvedPath: '',
        error: 'Config path contains suspicious characters'
      };
    }
  }

  // Verify the config file exists (if it doesn't, that's okay - the tool will report it)
  // But we should verify it's not trying to access something outside the repo
  if (!isPathWithinRepo(resolvedPath, repoRoot)) {
    return {
      valid: false,
      resolvedPath: '',
      error: 'Config path is outside repository'
    };
  }

  return {
    valid: true,
    resolvedPath,
    error: undefined
  };
}

/**
 * Creates a safe wrapper for MCP tool handlers that validates repoPath.
 *
 * Usage:
 *   export const handleTool = withRepoPathValidation(async (args, repoPath) => {
 *     // repoPath is guaranteed to be safe here
 *     const gitOps = new GitOperations(repoPath);
 *     // ...
 *   });
 *
 * @param handler - The handler function to wrap
 * @returns Wrapped handler function
 */
export function withRepoPathValidation(
  handler: (args: Record<string, unknown>, repoPath: string) => Promise<{
    content: { type: string; text: string }[];
    isError?: boolean;
  }>
): (args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}> {
  return async (args: Record<string, unknown>) => {
    const rawPath = (args?.path as string) || '.';

    const validation = validateRepoPath(rawPath);

    if (!validation.valid) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            error: `Invalid repository path: ${validation.error}`,
            path: rawPath
          })
        }],
        isError: true
      };
    }

    // Replace the path in args with the validated, resolved path
    const safeArgs = {
      ...args,
      path: validation.resolvedPath
    };

    return handler(safeArgs, validation.resolvedPath);
  };
}
