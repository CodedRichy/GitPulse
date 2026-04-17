/**
 * User Message UX Tests
 * Tests error message generation and formatting
 */

import { describe, it, expect } from 'vitest';
import {
  getUserMessage,
  formatErrorForTerminal,
  formatErrorForAPI,
} from '../user-messages.js';
import {
  GitError,
  ConfigError,
  SecurityError,
  AIError,
  ValidationError,
} from '../errors.js';

describe('User Error Messages', () => {
  describe('getUserMessage', () => {
    it('should provide title, message, and steps for any error', () => {
      const error = new GitError('Repository not found');
      const result = getUserMessage(error);

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('steps');
      expect(typeof result.title).toBe('string');
      expect(typeof result.message).toBe('string');
      expect(Array.isArray(result.steps)).toBe(true);
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it('should provide actionable steps', () => {
      const error = new GitError('not a git repository');
      const result = getUserMessage(error);

      expect(result.steps.length).toBeGreaterThan(0);
      result.steps.forEach(step => {
        expect(step.length).toBeGreaterThan(0);
        expect(step).not.toContain('${');
      });
    });

    it('should interpolate context variables', () => {
      const error = new ValidationError('Invalid file');
      const context = { path: '/home/user/file.txt', minimum: 50 };
      const result = getUserMessage(error, context);

      expect(result.message + result.steps.join('')).not.toContain('${');
    });

    it('should handle unknown error types gracefully', () => {
      const error = new Error('Generic error');
      const result = getUserMessage(error);

      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it('should handle string errors', () => {
      const result = getUserMessage('Something broke');

      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should categorize Git errors correctly', () => {
      const gitError = new GitError('not a git repository');
      const result = getUserMessage(gitError);

      expect(result.title).toContain('Not a Git Repository');
    });

    it('should categorize Config errors correctly', () => {
      const configError = new ConfigError('Config not found');
      const result = getUserMessage(configError);

      expect(result.title).toContain('Configuration');
    });

    it('should categorize Security errors correctly', () => {
      const securityError = new SecurityError('token expired');
      const result = getUserMessage(securityError);

      expect(result.title.toLowerCase()).toContain('expired');
    });

    it('should handle null context gracefully', () => {
      const error = new Error('Test error');
      const result = getUserMessage(error, undefined);

      expect(result.title).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
    });
  });

  describe('formatErrorForTerminal', () => {
    it('should format error with title, message, and numbered steps', () => {
      const error = new GitError('not a git repository');
      const formatted = formatErrorForTerminal(error);

      expect(formatted).toContain('❌');
      expect(formatted).toContain('Not a Git Repository');
      expect(formatted).toContain('1.');
      expect(formatted.split('\n').length).toBeGreaterThan(3);
    });

    it('should include context variables in formatted output', () => {
      const error = new ConfigError('Config missing field');
      const context = { field: 'apiKey', format: 'JSON' };
      const formatted = formatErrorForTerminal(error, context);

      expect(formatted).not.toContain('${field}');
      expect(formatted.toLowerCase()).toContain('what to do');
    });

    it('should be human-readable', () => {
      const error = new ValidationError('Invalid input');
      const formatted = formatErrorForTerminal(error);

      // Should have structure
      expect(formatted).toContain('\n');
      expect(formatted.length).toBeGreaterThan(20);
      // Should not have template artifacts
      expect(formatted).not.toContain('${');
    });

    it('should work for all common error types', () => {
      const errors = [
        new GitError('test'),
        new ConfigError('test'),
        new SecurityError('test'),
        new AIError('test'),
        new ValidationError('test'),
      ];

      errors.forEach(error => {
        const formatted = formatErrorForTerminal(error);
        expect(formatted).toContain('❌');
        expect(formatted).toContain('What to do:');
        expect(formatted.split('\n').length).toBeGreaterThan(5);
      });
    });

    it('should truncate very long context gracefully', () => {
      const error = new Error('Test');
      const longContext = {
        path: 'a'.repeat(1000),
        message: 'b'.repeat(1000),
      };
      const formatted = formatErrorForTerminal(error, longContext);

      expect(formatted.length).toBeLessThan(10000);
    });
  });

  describe('formatErrorForAPI', () => {
    it('should include standard error fields', () => {
      const error = new ValidationError('Invalid input');
      const result = formatErrorForAPI(error);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('body');
      expect(result.body).toHaveProperty('error');
      expect(result.body).toHaveProperty('message');
      expect(result.body).toHaveProperty('errorId');
      expect(result.body).toHaveProperty('suggestions');
    });

    it('should set correct HTTP status codes', () => {
      const cases = [
        { error: new ValidationError('test'), expectedStatus: 400 },
        { error: new SecurityError('test'), expectedStatus: 401 },
        { error: new ConfigError('test'), expectedStatus: 400 },
        { error: new AIError('test'), expectedStatus: 503 },
      ];

      cases.forEach(({ error, expectedStatus }) => {
        const result = formatErrorForAPI(error);
        expect(result.status).toBe(expectedStatus);
      });
    });

    it('should generate unique error IDs', () => {
      const error = new Error('Test');
      const result1 = formatErrorForAPI(error);
      const result2 = formatErrorForAPI(error);

      expect(result1.body.errorId).not.toBe(result2.body.errorId);
      expect(result1.body.errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
    });

    it('should include context in response', () => {
      const error = new ConfigError('test');
      const context = { field: 'apiKey', required: true };
      const result = formatErrorForAPI(error, context);

      expect(result.body.details).toEqual(context);
    });

    it('should provide actionable suggestions', () => {
      const error = new GitError('not a git repository');
      const result = formatErrorForAPI(error);

      expect(Array.isArray(result.body.suggestions)).toBe(true);
      expect(result.body.suggestions.length).toBeGreaterThan(0);
      result.body.suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });

    it('should return 500 for unknown errors', () => {
      const error = new Error('Unknown');
      const result = formatErrorForAPI(error);

      expect(result.status).toBe(500);
    });

    it('should be valid JSON serializable', () => {
      const error = new ConfigError('test');
      const result = formatErrorForAPI(error);

      expect(() => {
        JSON.stringify(result);
      }).not.toThrow();
    });
  });

  describe('Message Content Quality', () => {
    it('should not contain placeholder syntax in final messages', () => {
      const errors = [
        new GitError('test'),
        new ConfigError('test'),
        new SecurityError('test'),
      ];

      errors.forEach(error => {
        const message = getUserMessage(error);
        expect(message.message).not.toMatch(/\$\{[\w:]+\}/);
        message.steps.forEach(step => {
          expect(step).not.toMatch(/\$\{[\w:]+\}/);
        });
      });
    });

    it('should provide steps with concrete actions or helpful information', () => {
      const error = new GitError('not a git repository');
      const result = getUserMessage(error);

      // Steps should not be vague
      result.steps.forEach(step => {
        expect(step.length).toBeGreaterThan(5);
        // Should contain specific, helpful information
        expect(step).toMatch(/[a-zA-Z]{3,}/); // At least meaningful content
      });
    });

    it('should have consistent formatting', () => {
      const message1 = getUserMessage(new GitError('test'));
      const message2 = getUserMessage(new ConfigError('test'));

      // Both should have same structure
      expect(message1).toHaveProperty('title');
      expect(message2).toHaveProperty('title');
      expect(message1.title.length).toBeGreaterThan(0);
      expect(message2.title.length).toBeGreaterThan(0);
    });
  });

  describe('Context Interpolation', () => {
    it('should replace all instances of a context variable', () => {
      const error = new ValidationError('test');
      const context = { path: '/test/path' };
      const result = getUserMessage(error, context);

      const output = result.message + result.steps.join(' ');
      expect(output).not.toContain('${path}');
    });

    it('should handle multiple context variables', () => {
      const error = new ConfigError('test');
      const context = {
        field: 'apiKey',
        minimum: '20',
        format: 'string',
      };
      const result = getUserMessage(error, context);

      const output = result.message + result.steps.join(' ');
      expect(output).not.toContain('${');
    });

    it('should preserve steps unchanged if no context provided', () => {
      const error = new GitError('not a git repository');
      const result1 = getUserMessage(error);
      const result2 = getUserMessage(error, undefined);

      expect(result1.steps).toEqual(result2.steps);
    });

    it('should handle context with special characters', () => {
      const error = new ValidationError('test');
      const context = { path: '/path/with spaces/and-dashes/file_name.txt' };

      expect(() => {
        getUserMessage(error, context);
      }).not.toThrow();
    });
  });
});
