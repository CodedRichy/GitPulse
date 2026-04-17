/**
 * Config Validation Tests
 * Tests Zod schema validation for GitPulse configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateConfig,
  mergeConfigWithDefaults,
  validateConfigEnv,
  getDefaultConfigTemplate,
  GitPulseConfigSchema,
  type GitPulseConfig,
} from '../config-validation.js';

describe('Config Validation', () => {
  const validMinimalConfig = {
    projectName: 'Test Project',
  };

  const validCompleteConfig: GitPulseConfig = {
    version: '3.0',
    projectName: 'Test Project',
    description: 'A test project',
    core: {
      autoCommit: false,
      autoFix: true,
      dryRun: false,
      verbosity: 'info',
    },
    qualityGates: [
      {
        name: 'Message Quality',
        description: 'Check message length',
        rules: ['min-length'],
        severity: 'error',
      },
    ],
    conventions: [
      {
        name: 'Semantic Commits',
        type: 'commit-message',
        pattern: '/^(feat|fix):/i',
        enforcement: 'required',
      },
    ],
    ai: {
      enabled: true,
      provider: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
      },
      features: {
        commitMessages: true,
        codeSuggestions: false,
        issueAnalysis: false,
        prReviews: false,
      },
    },
    security: {
      validateSignatures: true,
      requireApprovals: 1,
      blockSecrets: true,
      bannedPatterns: ['password', 'secret'],
    },
  };

  describe('validateConfig', () => {
    it('should accept minimal valid config', () => {
      const result = validateConfig(validMinimalConfig);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should accept complete valid config', () => {
      const result = validateConfig(validCompleteConfig);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject config missing projectName', () => {
      const config = { description: 'No project name' };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Object.keys(result.errors!).length).toBeGreaterThan(0);
    });

    it('should reject invalid version', () => {
      const config = { projectName: 'Test', version: '99.0' };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid quality gate', () => {
      const config = {
        projectName: 'Test',
        qualityGates: [
          {
            name: 'Bad Gate',
            // Missing required fields
          },
        ],
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid convention pattern', () => {
      const config = {
        projectName: 'Test',
        conventions: [
          {
            name: 'Bad Convention',
            type: 'commit-message',
            pattern: 'not-a-regex', // Invalid regex
            enforcement: 'required',
          },
        ],
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid AI provider', () => {
      const config = {
        projectName: 'Test',
        ai: {
          enabled: true,
          provider: {
            provider: 'invalid-provider',
            model: 'test',
          },
        },
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid integration service', () => {
      const config = {
        projectName: 'Test',
        integrations: [
          {
            enabled: true,
            service: 'invalid-service',
          },
        ],
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject extra unknown fields (strict mode)', () => {
      const config = {
        projectName: 'Test',
        unknownField: 'should fail',
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
        expect(Object.keys(result.errors || {}).length).toBeGreaterThan(0);
    });

    it('should set proper error messages', () => {
      const config = { projectName: '' }; // Empty string
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Object.values(result.errors!).flat().join('')).toMatch(/required|empty|at least/i);
    });

    it('should validate temperature range for AI provider', () => {
      const config = {
        projectName: 'Test',
        ai: {
          enabled: true,
          provider: {
            provider: 'openai',
            model: 'test',
            temperature: 5, // Invalid - should be 0-2
          },
        },
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should validate max tokens is positive', () => {
      const config = {
        projectName: 'Test',
        ai: {
          enabled: true,
          provider: {
            provider: 'openai',
            model: 'test',
            maxTokens: 0, // Invalid
          },
        },
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('mergeConfigWithDefaults', () => {
    it('should provide defaults for minimal config', () => {
      const config = mergeConfigWithDefaults({ projectName: 'Test' });

      expect(config.version).toBe('3.0');
      expect(config.core).toBeDefined();
      expect(config.ai).toBeDefined();
      expect(config.core.verbosity).toBe('info');
    });

    it('should preserve user config values', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'My Project',
        core: {
          verbosity: 'debug',
          autoCommit: true,
        },
      });

      expect(config.projectName).toBe('My Project');
      expect(config.core.verbosity).toBe('debug');
      expect(config.core.autoCommit).toBe(true);
    });

    it('should override defaults with user config', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          enabled: false,
        },
      });

      expect(config.ai.enabled).toBe(false);
    });

    it('should maintain AI provider defaults', () => {
      const config = mergeConfigWithDefaults({ projectName: 'Test' });

      expect(config.ai?.provider.provider).toBe('openai');
      expect(config.ai?.provider.model).toBe('gpt-4');
      expect(config.ai?.provider.temperature).toBe(0.7);
    });

    it('should validate merged config', () => {
      const config = mergeConfigWithDefaults({ projectName: 'Test' });
      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
    });
  });

  describe('validateConfigEnv', () => {
    it('should pass with local AI provider (no API key needed)', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          provider: {
            provider: 'local',
            model: 'test',
          },
        },
      });

      const result = validateConfigEnv(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with ollama provider (no API key needed)', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          provider: {
            provider: 'ollama',
            model: 'test',
          },
        },
      });

      const result = validateConfigEnv(config);
      expect(result.valid).toBe(true);
    });

    it('should require API key for openai without config', () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          provider: {
            provider: 'openai',
            model: 'test',
            // No apiKey in config
          },
        },
      });

      const result = validateConfigEnv(config);
      expect(result.valid).toBe(false);
      expect(result.missing).toBeDefined();

      if (originalEnv) process.env.OPENAI_API_KEY = originalEnv;
    });

    it('should pass with API key in config', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          provider: {
            provider: 'openai',
            model: 'test',
            apiKey: 'sk-test-token-123',
          },
        },
      });

      const result = validateConfigEnv(config);
      expect(result.valid).toBe(true);
    });


    it('should check integration credentials', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          provider: {
            provider: 'local',
            model: 'test',
          },
        },
        integrations: [
          {
            enabled: true,
            service: 'github',
            // Missing credentials - should fail validation
          },
        ],
      });

      const result = validateConfigEnv(config);
      // Enabled integration without credentials should fail env validation
      expect(result.valid).toBe(false);
      expect(result.missing?.some((msg) => /integrations\[0\]\.credentials/.test(msg))).toBe(true);
    });

    it('should pass with integration credentials', () => {
      // Set environment variable for github token
      process.env.GITHUB_TOKEN = 'ghp_test_env_token';
      
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          provider: {
            provider: 'local',
            model: 'test',
          },
        },
        integrations: [
          {
            enabled: true,
            service: 'github',
            credentials: {
              token: 'ghp_test_token',
            },
          },
        ],
      });

      const result = validateConfigEnv(config);
      expect(result.valid).toBe(true);
      
      // Cleanup
      delete process.env.GITHUB_TOKEN;
    });

    it('should skip disabled integrations', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          provider: {
            provider: 'local',
            model: 'test',
          },
        },
        integrations: [
          {
            enabled: false,
            service: 'github',
            // No credentials needed - disabled integration
          },
        ],
      });

      const result = validateConfigEnv(config);
      // Disabled integrations should pass validation (no credentials needed)
      expect(result.valid).toBe(true);
    });

  });

  describe('getDefaultConfigTemplate', () => {
    it('should return valid JSON string', () => {
      const template = getDefaultConfigTemplate();

      expect(() => JSON.parse(template)).not.toThrow();
    });

    it('should include required fields', () => {
      const template = getDefaultConfigTemplate();
      const config = JSON.parse(template);

      expect(config.projectName).toBeDefined();
      expect(config.version).toBeDefined();
    });

    it('should have valid structure', () => {
      const template = getDefaultConfigTemplate();
      const config = JSON.parse(template);

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should be readable and formatted', () => {
      const template = getDefaultConfigTemplate();

      expect(template.includes('\n')).toBe(true);
      expect(template.includes('"')).toBe(true);
      expect(template.includes('{{')).toBe(false); // No template vars
    });
  });

  describe('Schema Type Safety', () => {
    it('should enforce required fields at type level', () => {
      // This is a compile-time check, but we can verify valid config has them
      const config = mergeConfigWithDefaults({ projectName: 'Test' });

      expect(config.projectName).toBeDefined();
      expect(typeof config.projectName).toBe('string');
    });

    it('should enforce enum values', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        core: {
          verbosity: 'info',
        },
      });

      expect(['debug', 'info', 'warn', 'error']).toContain(config.core?.verbosity);
    });

    it('should enforce number types', () => {
      const config = mergeConfigWithDefaults({
        projectName: 'Test',
        ai: {
          provider: {
            provider: 'openai',
            model: 'test',
            temperature: 0.5,
            maxTokens: 1000,
          },
        },
      });

      expect(typeof config.ai?.provider.temperature).toBe('number');
      expect(typeof config.ai?.provider.maxTokens).toBe('number');
    });
  });

  describe('Error Recovery', () => {
    it('should provide clear error paths', () => {
      const config = {
        projectName: 'Test',
        qualityGates: [
          {
            name: 'Bad Gate',
            rules: [], // Empty - invalid
          },
        ],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors || {})).toContain('qualityGates.0.rules');
    });

    it('should accumulate multiple errors', () => {
      const config = {
        projectName: '', // Invalid - too short
        ai: {
          provider: {
            provider: 'invalid', // Invalid provider
            model: '',
          },
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors || {}).length).toBeGreaterThan(1);
    });
  });
});
