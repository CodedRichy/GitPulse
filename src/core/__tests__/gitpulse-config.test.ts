import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadProjectConfig,
  saveProjectConfig,
  initProjectConfig,
  isGateEnabled,
  getGateSeverity,
  validateCommitMessage,
  getDefaultConfig,
} from '../gitpulse-config.js';

// ─── Helpers ─────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitpulse-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── loadProjectConfig ──────────────────────────────────

describe('loadProjectConfig', () => {
  it('returns defaults when no config file exists', () => {
    const config = loadProjectConfig(tmpDir);
    expect(config.version).toBe(1);
    expect(config.quality_gates['security-scan'].enabled).toBe(true);
    expect(config.conventions.commit_style).toBe('conventional');
    expect(config.hooks.pre_commit).toBe(true);
  });

  it('loads config from disk and merges with defaults', () => {
    const gpDir = path.join(tmpDir, '.gitpulse');
    fs.mkdirSync(gpDir, { recursive: true });
    fs.writeFileSync(
      path.join(gpDir, 'config.json'),
      JSON.stringify({
        version: 1,
        conventions: { commit_style: 'simple' },
      })
    );

    const config = loadProjectConfig(tmpDir);
    // Overridden value
    expect(config.conventions.commit_style).toBe('simple');
    // Default values still present
    expect(config.quality_gates['security-scan'].enabled).toBe(true);
    expect(config.hooks.pre_commit).toBe(true);
  });

  it('falls back to defaults on corrupted JSON', () => {
    const gpDir = path.join(tmpDir, '.gitpulse');
    fs.mkdirSync(gpDir, { recursive: true });
    fs.writeFileSync(path.join(gpDir, 'config.json'), '{bad json!!!');

    const config = loadProjectConfig(tmpDir);
    expect(config.version).toBe(1);
    expect(config.conventions.commit_style).toBe('conventional');
  });
});

// ─── saveProjectConfig ──────────────────────────────────

describe('saveProjectConfig', () => {
  it('creates .gitpulse directory and writes config', () => {
    const config = getDefaultConfig();
    config.conventions.commit_style = 'semantic';

    saveProjectConfig(config, tmpDir);

    const filePath = path.join(tmpDir, '.gitpulse', 'config.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(loaded.conventions.commit_style).toBe('semantic');
  });
});

// ─── initProjectConfig ──────────────────────────────────

describe('initProjectConfig', () => {
  it('creates default config if none exists', () => {
    const config = initProjectConfig(tmpDir);
    expect(config.version).toBe(1);

    const filePath = path.join(tmpDir, '.gitpulse', 'config.json');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('returns existing config if already initialized', () => {
    // First init
    initProjectConfig(tmpDir);

    // Modify the file
    const filePath = path.join(tmpDir, '.gitpulse', 'config.json');
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    existing.conventions.commit_style = 'simple';
    fs.writeFileSync(filePath, JSON.stringify(existing));

    // Second init should load the modified config
    const config = initProjectConfig(tmpDir);
    expect(config.conventions.commit_style).toBe('simple');
  });
});

// ─── isGateEnabled ──────────────────────────────────────

describe('isGateEnabled', () => {
  it('returns true for enabled gates', () => {
    const config = getDefaultConfig();
    expect(isGateEnabled(config, 'security-scan')).toBe(true);
    expect(isGateEnabled(config, 'code-smells')).toBe(true);
  });

  it('returns false for disabled gates', () => {
    const config = getDefaultConfig();
    config.quality_gates['security-scan'].enabled = false;
    expect(isGateEnabled(config, 'security-scan')).toBe(false);
  });

  it('returns true for unknown gates (default behavior)', () => {
    const config = getDefaultConfig();
    expect(isGateEnabled(config, 'nonexistent')).toBe(true);
  });
});

// ─── getGateSeverity ────────────────────────────────────

describe('getGateSeverity', () => {
  it('returns configured severity', () => {
    const config = getDefaultConfig();
    expect(getGateSeverity(config, 'security-scan')).toBe('critical');
    expect(getGateSeverity(config, 'documentation')).toBe('low');
  });

  it('returns "low" for unknown gates', () => {
    const config = getDefaultConfig();
    expect(getGateSeverity(config, 'nonexistent')).toBe('low');
  });
});

// ─── validateCommitMessage ──────────────────────────────

describe('validateCommitMessage', () => {
  const config = getDefaultConfig();

  it('validates correct conventional commit', () => {
    const result = validateCommitMessage('feat: add user login', config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('validates conventional commit with scope', () => {
    const result = validateCommitMessage('fix(auth): resolve token expiry', config);
    expect(result.valid).toBe(true);
  });

  it('rejects empty message', () => {
    const result = validateCommitMessage('', config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Commit message cannot be empty');
  });

  it('rejects invalid conventional format', () => {
    const result = validateCommitMessage('just some random text', config);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('conventional format');
  });

  it('rejects unknown commit type', () => {
    const result = validateCommitMessage('yolo: whatever', config);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid commit type');
  });

  it('warns when first line exceeds 72 chars', () => {
    const longMsg = 'feat: ' + 'a'.repeat(70);
    const result = validateCommitMessage(longMsg, config);
    expect(result.errors.some(e => e.includes('72'))).toBe(true);
  });

  it('enforces scope when configured', () => {
    const strictConfig = getDefaultConfig();
    strictConfig.conventions.enforce_scope = true;

    const noScope = validateCommitMessage('feat: no scope here', strictConfig);
    expect(noScope.valid).toBe(false);
    expect(noScope.errors.some(e => e.includes('Scope is required'))).toBe(true);

    const withScope = validateCommitMessage('feat(core): has scope', strictConfig);
    expect(withScope.valid).toBe(true);
  });

  it('skips type validation for simple style', () => {
    const simpleConfig = getDefaultConfig();
    simpleConfig.conventions.commit_style = 'simple';

    const result = validateCommitMessage('just a simple message', simpleConfig);
    expect(result.valid).toBe(true);
  });
});
