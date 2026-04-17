/**
 * GitPulse Configuration Validation with Zod
 * Comprehensive schema validation for gitpulse.config.ts/json
 */

import { z } from 'zod';

/**
 * Quality Gate Configuration
 */
export const QualityGateConfigSchema = z.object({
  enabled: z.boolean().default(true),
  name: z.string().min(1, 'Gate name required'),
  description: z.string().optional(),
  rules: z.array(z.string()).min(1, 'At least one rule required'),
  severity: z.enum(['error', 'warning', 'info']).default('error'),
  errorMessage: z.string().optional(),
  autoFix: z.boolean().default(false),
}).strict();

/**
 * Convention Configuration
 */
export const ConventionConfigSchema = z.object({
  name: z.string().min(1, 'Convention name required'),
  type: z.enum(['commit-message', 'branch-name', 'file-naming', 'code-style']),
  pattern: z.string().regex(/^\/.*\/[gimuy]*$/, 'Must be a valid regex pattern'),
  examples: z.array(z.object({
    valid: z.string(),
    invalid: z.array(z.string()),
  })).optional(),
  enforcement: z.enum(['required', 'suggested', 'disabled']).default('suggested'),
  helpUrl: z.string().url('Invalid URL').optional(),
}).strict();

/**
 * AI Provider Configuration
 */
export const AIProviderConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'ollama', 'local']),
  model: z.string().min(1, 'Model name required'),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(2000),
  timeout: z.number().positive().default(30000),
  retryCount: z.number().nonnegative().default(3),
  retryDelay: z.number().positive().default(1000),
}).strict();

/**
 * Integration Configuration
 */
export const IntegrationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  service: z.enum(['github', 'gitlab', 'bitbucket', 'slack', 'jira', 'linear']),
  credentials: z.object({
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  webhooks: z.object({
    url: z.string().url('Invalid webhook URL'),
    events: z.array(z.string()),
    secret: z.string().optional(),
  }).optional(),
  autoSync: z.boolean().default(false),
  syncInterval: z.number().positive().optional(),
}).strict();

/**
 * Main GitPulse Configuration Schema
 */
export const GitPulseConfigSchema = z.object({
  version: z.literal('1.0').or(z.literal('2.0')).or(z.literal('3.0')).default('3.0'),
  projectName: z.string().min(1, 'Project name required'),
  description: z.string().optional(),
  
  // Core settings
  core: z.object({
    autoCommit: z.boolean().default(false),
    autoFix: z.boolean().default(false),
    dryRun: z.boolean().default(false),
    verbosity: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info'),
  }).optional(),

  // Quality gates
  qualityGates: z.array(QualityGateConfigSchema).optional(),

  // Conventions
  conventions: z.array(ConventionConfigSchema).optional(),

  // AI Configuration
  ai: z.object({
    enabled: z.boolean().default(true),
    provider: AIProviderConfigSchema,
    features: z.object({
      commitMessages: z.boolean().default(true),
      codeSuggestions: z.boolean().default(false),
      issueAnalysis: z.boolean().default(false),
      prReviews: z.boolean().default(false),
    }).optional(),
  }).optional(),

  // Integrations
  integrations: z.array(IntegrationConfigSchema).optional(),

  // Exclude patterns
  exclude: z.object({
    files: z.array(z.string()).optional(),
    directories: z.array(z.string()).optional(),
    branches: z.array(z.string()).optional(),
  }).optional(),

  // Security
  security: z.object({
    validateSignatures: z.boolean().default(false),
    requireApprovals: z.number().min(0).default(0),
    blockSecrets: z.boolean().default(true),
    bannedPatterns: z.array(z.string()).optional(),
  }).optional(),

  // Performance
  performance: z.object({
    maxParallel: z.number().positive().default(4),
    cache: z.boolean().default(true),
    cacheDuration: z.number().positive().default(3600),
  }).optional(),

  // Logging
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'text']).default('text'),
    destination: z.string().optional(),
  }).optional(),

  // Custom rules/gates
  customRules: z.record(z.string(), z.any()).optional(),

}).strict();

/**
 * Type inference from schema
 */
export type GitPulseConfig = z.infer<typeof GitPulseConfigSchema>;
export type QualityGateConfig = z.infer<typeof QualityGateConfigSchema>;
export type ConventionConfig = z.infer<typeof ConventionConfigSchema>;
export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;
export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;

/**
 * Validate config and return errors
 */
export function validateConfig(config: unknown): { valid: boolean; data?: GitPulseConfig; errors?: Record<string, string[]> } {
  try {
    const data = GitPulseConfigSchema.parse(config);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach(err => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return { valid: false, errors };
    }
    return {
      valid: false,
      errors: { 'config': ['Unknown validation error'] }
    };
  }
}

/**
 * Deep merge configuration with defaults
 */
export function mergeConfigWithDefaults(userConfig: Partial<GitPulseConfig>): GitPulseConfig {
  const defaults: GitPulseConfig = {
    version: '3.0',
    projectName: 'GitPulse Project',
    core: {
      autoCommit: false,
      autoFix: false,
      dryRun: false,
      verbosity: 'info',
    },
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
  };

  return GitPulseConfigSchema.parse({
    ...defaults,
    ...userConfig,
    core: {
      ...defaults.core,
      ...userConfig.core,
    },
    ai: {
      ...defaults.ai,
      ...userConfig.ai,
      provider: {
        ...defaults.ai?.provider,
        ...userConfig.ai?.provider,
      },
      features: {
        ...defaults.ai?.features,
        ...userConfig.ai?.features,
      },
    },
  });
}

/**
 * Validate environment variables exist for config
 */
export function validateConfigEnv(config: GitPulseConfig): { valid: boolean; missing?: string[] } {
  const missing: string[] = [];

  // Check AI provider credentials
  if (config.ai?.enabled && config.ai?.provider) {
    const { provider, apiKey } = config.ai.provider;
    
    if (provider !== 'local' && provider !== 'ollama') {
      const envVar = `${provider.toUpperCase()}_API_KEY`;
      if (!apiKey && !process.env[envVar]) {
        missing.push(`${envVar} or config.ai.provider.apiKey`);
      }
    }
  }

  // Check integration credentials
  config.integrations?.forEach((integration, idx) => {
    if (integration.enabled) {
      // Enabled integrations must have credentials
      if (!integration.credentials) {
        missing.push(`integrations[${idx}].credentials required for enabled integration`);
      } else {
        const { token, username, password } = integration.credentials;
        // Must have at least one credential value
        if (!token && !username && !password) {
          missing.push(`integrations[${idx}].credentials (one of: token, username/password)`);
        }
      }
    }
  });

  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Get default config template
 */
export function getDefaultConfigTemplate(): string {
  return `{
  "version": "3.0",
  "projectName": "My Project",
  "description": "GitPulse configuration",
  
  "core": {
    "autoCommit": false,
    "autoFix": false,
    "verbosity": "info"
  },

  "qualityGates": [
    {
      "name": "Commit Message Quality",
      "description": "Enforce quality commit messages",
      "rules": ["commit-message-min-length", "commit-message-format"],
      "severity": "error"
    }
  ],

  "conventions": [
    {
      "name": "Semantic Commits",
      "type": "commit-message",
      "pattern": "/^(feat|fix|docs|style|refactor|test|chore):/",
      "enforcement": "required"
    }
  ],

  "ai": {
    "enabled": true,
    "provider": {
      "provider": "openai",
      "model": "gpt-4"
    },
    "features": {
      "commitMessages": true,
      "codeSuggestions": false
    }
  },

  "security": {
    "blockSecrets": true,
    "validateSignatures": false
  },

  "performance": {
    "maxParallel": 4,
    "cache": true,
    "cacheDuration": 3600
  }
}`;
}
