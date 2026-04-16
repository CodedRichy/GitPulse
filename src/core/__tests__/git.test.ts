import { describe, it, expect } from 'vitest';
import { GitOperations } from '../git.js';

// ─── GitOperations — Unit Tests ──────────────────────────
// These tests run against the actual GitPulse repo (which IS a git repo).
// They test read-only operations only — no commits, staging, or mutations.

describe('GitOperations — isRepo', () => {
  it('returns true for the current repo', async () => {
    const git = new GitOperations('.');
    const result = await git.isRepo();
    expect(result).toBe(true);
  });

  it('returns false for a non-repo directory', async () => {
    // node_modules is not a git repo
    const git = new GitOperations(process.env.TEMP || '/tmp');
    const result = await git.isRepo();
    expect(result).toBe(false);
  });
});

describe('GitOperations — getStatus', () => {
  it('returns a valid status object', async () => {
    const git = new GitOperations('.');
    const status = await git.getStatus();

    expect(status).toHaveProperty('staged');
    expect(status).toHaveProperty('unstaged');
    expect(status).toHaveProperty('untracked');
    expect(status).toHaveProperty('branch');
    expect(status).toHaveProperty('ahead');
    expect(status).toHaveProperty('behind');
    expect(status).toHaveProperty('isClean');

    expect(Array.isArray(status.staged)).toBe(true);
    expect(Array.isArray(status.unstaged)).toBe(true);
    expect(Array.isArray(status.untracked)).toBe(true);
    expect(typeof status.branch).toBe('string');
    expect(typeof status.ahead).toBe('number');
    expect(typeof status.behind).toBe('number');
    expect(typeof status.isClean).toBe('boolean');
  });

  it('returns a non-empty branch name', async () => {
    const git = new GitOperations('.');
    const status = await git.getStatus();
    expect(status.branch.length).toBeGreaterThan(0);
  });
});

describe('GitOperations — getCurrentBranch', () => {
  it('returns a branch name', async () => {
    const git = new GitOperations('.');
    const branch = await git.getCurrentBranch();
    expect(typeof branch).toBe('string');
    expect(branch.length).toBeGreaterThan(0);
  });
});

describe('GitOperations — getRepoRoot', () => {
  it('returns the repo root path', async () => {
    const git = new GitOperations('.');
    const root = await git.getRepoRoot();
    expect(typeof root).toBe('string');
    expect(root.length).toBeGreaterThan(0);
    // Root should contain package.json (we know this is the GitPulse repo)
    expect(root.toLowerCase()).toContain('gitpulse');
  });
});

describe('GitOperations — getRecentCommits', () => {
  it('returns an array of commits', async () => {
    const git = new GitOperations('.');
    const commits = await git.getRecentCommits(5);
    expect(Array.isArray(commits)).toBe(true);
    expect(commits.length).toBeGreaterThan(0);
    expect(commits.length).toBeLessThanOrEqual(5);
  });

  it('each commit has required fields', async () => {
    const git = new GitOperations('.');
    const commits = await git.getRecentCommits(3);
    for (const commit of commits) {
      expect(commit).toHaveProperty('hash');
      expect(commit).toHaveProperty('message');
      expect(commit).toHaveProperty('author');
      expect(commit).toHaveProperty('date');
      expect(typeof commit.hash).toBe('string');
      expect(typeof commit.message).toBe('string');
      expect(commit.hash.length).toBeGreaterThan(0);
    }
  });
});

describe('GitOperations — getStagedDiff', () => {
  it('returns a string (may be empty if nothing staged)', async () => {
    const git = new GitOperations('.');
    const diff = await git.getStagedDiff();
    expect(typeof diff).toBe('string');
  });
});

describe('GitOperations — getFileChanges', () => {
  it('returns an array of file changes', async () => {
    const git = new GitOperations('.');
    const changes = await git.getFileChanges();
    expect(Array.isArray(changes)).toBe(true);
    for (const change of changes) {
      expect(change).toHaveProperty('path');
      expect(change).toHaveProperty('status');
      expect(change).toHaveProperty('additions');
      expect(change).toHaveProperty('deletions');
    }
  });
});
