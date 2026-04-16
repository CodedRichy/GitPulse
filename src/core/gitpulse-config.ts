import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom quality gate configuration.
 * Teams can define their own regex-based checks.
 */
export interface CustomGateConfig {
  /** Unique gate name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Regex pattern to search for */
  pattern: string;
  /** Severity level for violations */
  severity: 'critical' | 'high' | 'medium' | 'low';
  // File glob patterns to include (e.g., src/**/*.ts)
  include?: string[];
  // File glob patterns to exclude (e.g., **/*.test.ts)
  exclude?: string[];
  // Optional: pattern that must coexist in the same file (for must_coexist rules)
  must_coexist?: string;
  // Optional: custom error message
  message?: string;
  // Optional: suggested fix
  fix?: string;
}

/**
 * GitPulse project configuration schema.
 * Loaded from `.gitpulse/config.json` in the repo root.
 * This is the team-editable configuration that controls quality gates,
 * convention enforcement, and hook behavior.
 */
export interface GitPulseProjectConfig {
  /** Config schema version */
  version: number;

  /** Quality gate configuration */
  quality_gates: {
    [gateName: string]: {
      enabled: boolean;
      /** Severity threshold — issues at or above this level block in strict mode */
      severity: 'critical' | 'high' | 'medium' | 'low';
    };
  };

  /** Custom quality gates defined by the team */
  custom_gates?: CustomGateConfig[];

  /** Convention enforcement rules */
  conventions: {
    /** Commit message format */
    commit_style: 'conventional' | 'semantic' | 'simple';
    /** Require scope in conventional commits */
    enforce_scope: boolean;
    /** Allowed conventional commit types */
    allowed_types: string[];
    /** Auto-learn conventions from history */
    auto_learn: boolean;
  };

  /** Git hook configuration */
  hooks: {
    /** Install pre-commit hook */
    pre_commit: boolean;
    /** Install commit-msg hook */
    commit_msg: boolean;
  };

  /** Subscription tier (free, pro, team) - for feature gating */
  tier?: 'free' | 'pro' | 'team';
}

const DEFAULT_CONFIG: GitPulseProjectConfig = {
  version: 1,
  quality_gates: {
    'security-scan': { enabled: true, severity: 'critical' },
    'code-smells': { enabled: true, severity: 'high' },
    'test-coverage': { enabled: true, severity: 'medium' },
    'documentation': { enabled: true, severity: 'low' },
  },
  conventions: {
    commit_style: 'conventional',
    enforce_scope: false,
    allowed_types: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'ci', 'perf', 'build', 'revert'],
    auto_learn: true,
  },
  hooks: {
    pre_commit: true,
    commit_msg: true,
  },
};

const CONFIG_FILENAME = 'config.json';
const GITPULSE_DIR = '.gitpulse';

/**
 * Load project config from `.gitpulse/config.json`.
 * Falls back to defaults if file doesn't exist.
 */
export function loadProjectConfig(repoRoot?: string): GitPulseProjectConfig {
  const configPath = resolveConfigPath(repoRoot);

  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);

      // Merge with defaults (so new fields get default values)
      return deepMerge(DEFAULT_CONFIG, parsed) as GitPulseProjectConfig;
    }
  } catch {
    // Corrupted config — fall back to defaults
  }

  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

/**
 * Save project config to `.gitpulse/config.json`.
 */
export function saveProjectConfig(config: GitPulseProjectConfig, repoRoot?: string): void {
  const configPath = resolveConfigPath(repoRoot);
  const dir = path.dirname(configPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Create a new default config file if one doesn't exist.
 * Returns the config (default or existing).
 */
export function initProjectConfig(repoRoot?: string): GitPulseProjectConfig {
  const configPath = resolveConfigPath(repoRoot);

  if (fs.existsSync(configPath)) {
    return loadProjectConfig(repoRoot);
  }

  const config = { ...DEFAULT_CONFIG };
  saveProjectConfig(config, repoRoot);
  return config;
}

/**
 * Check if a quality gate is enabled in the config.
 */
export function isGateEnabled(config: GitPulseProjectConfig, gateName: string): boolean {
  const gate = config.quality_gates[gateName];
  return gate?.enabled ?? true;
}

/**
 * Get the severity threshold for a gate.
 */
export function getGateSeverity(config: GitPulseProjectConfig, gateName: string): string {
  const gate = config.quality_gates[gateName];
  return gate?.severity ?? 'low';
}

/**
 * Validate a commit message against the configured conventions.
 */
export function validateCommitMessage(
  message: string,
  config: GitPulseProjectConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const style = config.conventions.commit_style;

  if (!message || message.trim().length === 0) {
    return { valid: false, errors: ['Commit message cannot be empty'] };
  }

  if (style === 'conventional') {
    // Pattern: type(scope): description  OR  type: description
    const conventionalPattern = /^(\w+)(?:\(([^)]+)\))?:\s(.+)$/;
    const firstLine = message.split('\n')[0];
    const match = firstLine.match(conventionalPattern);

    if (!match) {
      errors.push(
        `Commit message must follow conventional format: type(scope): description`
      );
      return { valid: false, errors };
    }

    const [, type, scope] = match;

    // Validate type
    if (!config.conventions.allowed_types.includes(type)) {
      errors.push(
        `Invalid commit type "${type}". Allowed: ${config.conventions.allowed_types.join(', ')}`
      );
    }

    // Validate scope if enforced
    if (config.conventions.enforce_scope && !scope) {
      errors.push('Scope is required. Use format: type(scope): description');
    }
  }

  // General validations
  const firstLine = message.split('\n')[0];
  if (firstLine.length > 72) {
    errors.push(`First line is ${firstLine.length} chars — keep under 72`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get the default config (useful for generating template files).
 */
export function getDefaultConfig(): GitPulseProjectConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

// ─── Internal helpers ────────────────────────────────────

function resolveConfigPath(repoRoot?: string): string {
  const base = repoRoot || process.cwd();
  return path.join(base, GITPULSE_DIR, CONFIG_FILENAME);
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
