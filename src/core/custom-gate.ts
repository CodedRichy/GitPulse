import { QualityGate, FileChange, GateResult, QualityIssue } from './quality-gates.js';
import { CustomGateConfig } from './gitpulse-config.js';
import * as path from 'path';

// Maximum regex execution time to prevent ReDoS attacks (milliseconds)
const REGEX_TIMEOUT_MS = 1000;

// Suspicious ReDoS patterns that can cause catastrophic backtracking
const REDOS_PATTERNS = [
  /\(\?\![^)]*\*\+|\+\)/, // Negative lookahead with quantifiers
  /\([^)]*\([^)]*\*[^)]*\)\*\)/, // Nested quantifiers
  /\([^)]*\+[^)]*\)\+/, // Quantified groups with +
  /\([^)]*\*[^)]*\)\*/, // Quantified groups with *
  /\([^)]*\+\+[^)]*\)/, // Double + inside groups
  /\([^)]*\*\*[^)]*\)/, // Double * inside groups
  /\([^)]*\*\+[^)]*\)/, // Mixed *+ inside groups
  /\([^)]*\+\*[^)]*\)/, // Mixed +* inside groups
];

/**
 * Checks if a regex pattern is potentially vulnerable to ReDoS.
 */
function isReDoSVulnerable(pattern: string): boolean {
  return REDOS_PATTERNS.some(redosPattern => redosPattern.test(pattern));
}

/**
 * Executes regex with timeout protection to prevent ReDoS.
 * This is a stateful wrapper around RegExp.exec() that adds timeout checks.
 */
function execWithTimeout(
  pattern: RegExp,
  content: string,
  timeoutMs: number = REGEX_TIMEOUT_MS,
  state: { startTime: number; iterations: number }
): RegExpExecArray | null {
  // Check timeout on every call
  if (Date.now() - state.startTime > timeoutMs) {
    throw new Error('Regex execution timeout - pattern may be vulnerable to ReDoS');
  }
  
  // Check iteration limit
  state.iterations++;
  if (state.iterations > 10000) {
    throw new Error('Regex iteration limit exceeded - pattern may be vulnerable to ReDoS');
  }
  
  const match = pattern.exec(content);
  
  // Prevent infinite loop on zero-length matches
  if (match && match.index === pattern.lastIndex) {
    pattern.lastIndex++;
  }
  
  return match;
}

/**
 * Custom quality gate that runs regex patterns defined in config.
 * Supports include/exclude globs and must_coexist rules.
 */
export class CustomGate implements QualityGate {
  name: string;
  description: string;
  private config: CustomGateConfig;

  constructor(config: CustomGateConfig) {
    this.config = config;
    this.name = `custom:${config.name}`;
    this.description = config.description;
  }

  async check(changes: FileChange[]): Promise<GateResult> {
    const startTime = Date.now();
    const issues: QualityIssue[] = [];

    // Security: Check for ReDoS vulnerability in patterns
    if (isReDoSVulnerable(this.config.pattern)) {
      return {
        gateName: this.name,
        passed: false,
        score: 0,
        severity: 'critical',
        issues: [{
          severity: 'critical',
          category: 'security',
          file: 'config',
          message: `Custom gate "${this.config.name}" has a regex pattern that may be vulnerable to ReDoS attacks`,
          fix: 'Simplify the regex pattern to avoid nested quantifiers',
        }],
        suggestions: ['Review the regex pattern in .gitpulse/config.yml'],
        duration: 0,
      };
    }

    const pattern = new RegExp(this.config.pattern, 'gi');

    // Security: Also check must_coexist pattern for ReDoS
    if (this.config.must_coexist && isReDoSVulnerable(this.config.must_coexist)) {
      return {
        gateName: this.name,
        passed: false,
        score: 0,
        severity: 'critical',
        issues: [{
          severity: 'critical',
          category: 'security',
          file: 'config',
          message: `Custom gate "${this.config.name}" has a must_coexist pattern that may be vulnerable to ReDoS attacks`,
          fix: 'Simplify the must_coexist regex pattern to avoid nested quantifiers',
        }],
        suggestions: ['Review the must_coexist pattern in .gitpulse/config.yml'],
        duration: 0,
      };
    }

    const mustCoexistPattern = this.config.must_coexist
      ? new RegExp(this.config.must_coexist, 'i')
      : null;

    for (const change of changes) {
      if (!change.content || change.status === 'deleted') continue;

      // Check include/exclude globs
      if (!this.shouldCheckFile(change.path)) continue;

      const lines = change.content.split('\n');

      // Check for pattern violations (with ReDoS protection)
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      const regexState = { startTime: Date.now(), iterations: 0 };

      try {
        while ((match = execWithTimeout(pattern, change.content, REGEX_TIMEOUT_MS, regexState)) !== null) {
          const lineNum = this.getLineNumber(change.content, match.index);

          // If must_coexist is specified, check that pattern exists in the file
          if (mustCoexistPattern) {
            mustCoexistPattern.lastIndex = 0;
            if (mustCoexistPattern.test(change.content)) {
              // Pattern coexists, no violation
              continue;
            }
          }

          issues.push({
            severity: this.config.severity,
            category: 'style',
            file: change.path,
            line: lineNum,
            message: this.config.message || `Custom gate violation: ${this.config.description}`,
            code: this.extractCodeSnippet(lines, lineNum),
            fix: this.config.fix,
          });
        }
      } catch (error) {
        // Regex timeout or error
        issues.push({
          severity: 'critical',
          category: 'security',
          file: change.path,
          message: `Regex execution failed in custom gate "${this.config.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          fix: 'Check the regex pattern for ReDoS vulnerabilities',
        });
      }
    }

    const score = Math.max(0, 100 - issues.length * 10);
    const passed = this.config.severity === 'critical'
      ? issues.filter(i => i.severity === 'critical').length === 0
      : this.config.severity === 'high'
        ? issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0
        : true;

    return {
      gateName: this.name,
      passed,
      score,
      severity: this.config.severity,
      issues,
      suggestions: issues.length > 0
        ? [`${issues.length} violations of "${this.config.description}"`, this.config.fix].filter((s): s is string => typeof s === 'string')
        : [`Custom gate "${this.config.name}" passed`],
      duration: Date.now() - startTime,
    };
  }

  /**
   * Check if a file should be checked based on include/exclude globs.
   */
  private shouldCheckFile(filePath: string): boolean {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Check includes first (if specified)
    if (this.config.include && this.config.include.length > 0) {
      const included = this.config.include.some(pattern =>
        this.matchGlob(normalizedPath, pattern)
      );
      if (!included) return false;
    }

    // Check excludes
    if (this.config.exclude && this.config.exclude.length > 0) {
      const excluded = this.config.exclude.some(pattern =>
        this.matchGlob(normalizedPath, pattern)
      );
      if (excluded) return false;
    }

    return true;
  }

  /**
   * Simple glob matching (supports *, **, and ? wildcards).
   * This is a simplified implementation - for production, use minimatch or picomatch.
   */
  private matchGlob(filePath: string, pattern: string): boolean {
    // Normalize pattern
    const normalizedPattern = pattern.replace(/\\/g, '/');
    const normalizedFilePath = filePath.replace(/\\/g, '/');

    // Simple glob matching without full regex conversion
    const patternParts = normalizedPattern.split('/');
    const pathParts = normalizedFilePath.split('/');

    // Handle ** (matches any number of directory levels)
    if (normalizedPattern.includes('**')) {
      // Replace ** with a placeholder and handle it specially
      const regexPattern = normalizedPattern
        .replace(/\.\*\*/g, '__DOUBLESTAR__')  // escape existing .**
        .replace(/\*\*/g, '.*')               // ** matches anything including /
        .replace(/\*/g, '[^/]*')             // * matches any char except /
        .replace(/\?/g, '.')                 // ? matches single char
        .replace(/__DOUBLESTAR__/g, '\\.\\*\\*'); // restore escaped

      try {
        // Match at start or after any /
        const regex = new RegExp('(^|/)' + regexPattern + '$', 'i');
        return regex.test(normalizedFilePath);
      } catch {
        return normalizedFilePath.includes(normalizedPattern.replace(/\*\*/g, '').replace(/\*/g, ''));
      }
    }

    // Simple * and ? matching
    const regexPattern = normalizedPattern
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    try {
      const regex = new RegExp('(^|/)' + regexPattern + '$', 'i');
      return regex.test(normalizedFilePath);
    } catch {
      return normalizedFilePath.includes(normalizedPattern.replace(/\*/g, ''));
    }
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private extractCodeSnippet(lines: string[], lineNum: number, context: number = 2): string {
    const start = Math.max(0, lineNum - context - 1);
    const end = Math.min(lines.length, lineNum + context);
    return lines.slice(start, end).join('\n');
  }
}

/**
 * Load custom gates from project config.
 */
export function loadCustomGates(configs: CustomGateConfig[] | undefined): CustomGate[] {
  if (!configs || configs.length === 0) return [];

  return configs.map(config => new CustomGate(config));
}

/**
 * Validate a custom gate configuration.
 */
export function validateCustomGate(config: CustomGateConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Custom gate must have a name');
  }

  if (!config.pattern || config.pattern.trim().length === 0) {
    errors.push('Custom gate must have a pattern');
  } else {
    // Validate regex
    try {
      new RegExp(config.pattern, 'i');
    } catch {
      errors.push(`Invalid regex pattern: ${config.pattern}`);
    }
  }

  if (!config.description || config.description.trim().length === 0) {
    errors.push('Custom gate must have a description');
  }

  if (!config.severity || !['critical', 'high', 'medium', 'low'].includes(config.severity)) {
    errors.push(`Invalid severity: ${config.severity || 'undefined'}. Must be one of: critical, high, medium, low`);
  }

  // Validate must_coexist pattern if provided
  if (config.must_coexist) {
    try {
      new RegExp(config.must_coexist, 'i');
    } catch {
      errors.push(`Invalid must_coexist regex: ${config.must_coexist}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
