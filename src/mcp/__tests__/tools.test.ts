import { describe, it, expect } from 'vitest';
import { handleAnalyzeRepo } from '../tools/analyze-repo.js';
import { handleValidateCommit } from '../tools/validate-commit.js';
import { handleGetConfig } from '../tools/get-config.js';
import { handleAnalyzeFile } from '../tools/analyze-file.js';
import { handleSearchHistory } from '../tools/search-history.js';
import { handleBranchInfo } from '../tools/branch-info.js';
import { GitPulseMCPServer } from '../server.js';

// ─── Server Registration ─────────────────────────────────

describe('GitPulseMCPServer — tool registration', () => {
  it('registers all 10 tools', () => {
    const server = new GitPulseMCPServer();
    const tools = server.getRegisteredTools();
    expect(tools).toContain('analyze_repo');
    expect(tools).toContain('suggest_commit');
    expect(tools).toContain('review_changes');
    expect(tools).toContain('run_quality_gates');
    expect(tools).toContain('validate_commit_message');
    expect(tools).toContain('get_conventions');
    expect(tools).toContain('search_commit_history');
    expect(tools).toContain('get_branch_info');
    expect(tools).toContain('get_config');
    expect(tools).toContain('analyze_file');
    expect(tools.length).toBe(10);
  });
});

// ─── analyze_repo ────────────────────────────────────────

describe('analyze_repo', () => {
  it('returns repo analysis for current directory', async () => {
    const result = await handleAnalyzeRepo({});
    const data = JSON.parse(result.content[0].text);
    expect(data.isRepository).toBe(true);
    expect(data.branch).toBeTruthy();
    expect(data.status).toHaveProperty('staged');
    expect(data.status).toHaveProperty('unstaged');
    expect(data.status).toHaveProperty('untracked');
    expect(data.health).toBeGreaterThanOrEqual(0);
    expect(data.health).toBeLessThanOrEqual(100);
  });
});

// ─── validate_commit_message ─────────────────────────────

describe('validate_commit_message', () => {
  it('validates correct conventional commit', async () => {
    const result = await handleValidateCommit({ message: 'feat: add new feature' });
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(true);
    expect(data.errors).toEqual([]);
  });

  it('rejects invalid format', async () => {
    const result = await handleValidateCommit({ message: 'random text' });
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it('rejects empty message', async () => {
    const result = await handleValidateCommit({});
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
  });

  it('returns allowed types', async () => {
    const result = await handleValidateCommit({ message: 'feat: test' });
    const data = JSON.parse(result.content[0].text);
    expect(data.allowedTypes).toContain('feat');
    expect(data.allowedTypes).toContain('fix');
    expect(data.style).toBe('conventional');
  });
});

// ─── get_config ──────────────────────────────────────────

describe('get_config', () => {
  it('returns config with summary', async () => {
    const result = await handleGetConfig({});
    const data = JSON.parse(result.content[0].text);
    expect(data.config).toHaveProperty('version');
    expect(data.config).toHaveProperty('quality_gates');
    expect(data.config).toHaveProperty('conventions');
    expect(data.summary).toHaveProperty('commitStyle');
    expect(data.summary).toHaveProperty('allowedTypes');
    expect(data.summary).toHaveProperty('enabledGates');
  });
});

// ─── analyze_file ────────────────────────────────────────

describe('analyze_file', () => {
  it('analyzes a TypeScript file', async () => {
    const result = await handleAnalyzeFile({ file: 'src/index.ts' });
    const data = JSON.parse(result.content[0].text);
    expect(data.file).toBe('src/index.ts');
    expect(data.language).toBe('TypeScript');
    expect(data.totalLines).toBeGreaterThan(0);
    expect(data).toHaveProperty('exports');
    expect(data).toHaveProperty('imports');
    expect(data).toHaveProperty('functions');
    expect(data).toHaveProperty('complexity');
  });

  it('returns error for missing file', async () => {
    const result = await handleAnalyzeFile({ file: 'nonexistent.ts' });
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain('not found');
  });

  it('returns error when no file specified', async () => {
    const result = await handleAnalyzeFile({});
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain('required');
  });
});

// ─── search_commit_history ───────────────────────────────

describe('search_commit_history', () => {
  it('returns recent commits', async () => {
    const result = await handleSearchHistory({ limit: 5 });
    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBeGreaterThan(0);
    expect(data.commits.length).toBeLessThanOrEqual(5);
    expect(data.commits[0]).toHaveProperty('hash');
    expect(data.commits[0]).toHaveProperty('message');
    expect(data.commits[0]).toHaveProperty('author');
    expect(data.commits[0]).toHaveProperty('date');
  });

  it('filters by query', async () => {
    // Searching for a term unlikely to match — should return 0 or fewer
    const result = await handleSearchHistory({ query: 'xyznonexistent12345', limit: 10 });
    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBe(0);
  });

  it('respects limit', async () => {
    const result = await handleSearchHistory({ limit: 3 });
    const data = JSON.parse(result.content[0].text);
    expect(data.commits.length).toBeLessThanOrEqual(3);
  });
});

// ─── get_branch_info ─────────────────────────────────────

describe('get_branch_info', () => {
  it('returns branch context', async () => {
    const result = await handleBranchInfo({});
    const data = JSON.parse(result.content[0].text);
    expect(data.branch).toBeTruthy();
    expect(data.sync).toHaveProperty('ahead');
    expect(data.sync).toHaveProperty('behind');
    expect(data.sync).toHaveProperty('status');
    expect(data.workingTree).toHaveProperty('staged');
    expect(data.workingTree).toHaveProperty('isClean');
    expect(data.recentCommits.length).toBeGreaterThan(0);
  });

  it('respects commitCount param', async () => {
    const result = await handleBranchInfo({ commitCount: 2 });
    const data = JSON.parse(result.content[0].text);
    expect(data.recentCommits.length).toBeLessThanOrEqual(2);
  });
});
