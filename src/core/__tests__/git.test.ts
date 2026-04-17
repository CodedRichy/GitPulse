import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitOperations } from '../git.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

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

// ─── Isolated Tests with Temporary Repo ─────────────────

describe('GitOperations — Integration with Temp Repo', () => {
  let tempDir: string;
  let gitOps: GitOperations;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitpulse-test-'));

    // Initialize git repo
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });

    gitOps = new GitOperations(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getStatus() — edge cases', () => {
    it('detects untracked files', async () => {
      fs.writeFileSync(path.join(tempDir, 'untracked.txt'), 'content');

      const status = await gitOps.getStatus();
      expect(status.untracked).toContain('untracked.txt');
      expect(status.isClean).toBe(false);
    });

    it('detects staged files', async () => {
      fs.writeFileSync(path.join(tempDir, 'staged.txt'), 'content');
      execSync('git add staged.txt', { cwd: tempDir, stdio: 'ignore' });

      const status = await gitOps.getStatus();
      expect(status.staged).toContain('staged.txt');
    });

    it('detects unstaged changes', async () => {
      fs.writeFileSync(path.join(tempDir, 'modified.txt'), 'initial');
      execSync('git add modified.txt', { cwd: tempDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });

      fs.writeFileSync(path.join(tempDir, 'modified.txt'), 'changed');

      const status = await gitOps.getStatus();
      expect(status.unstaged.some(f => f.includes('modified.txt'))).toBe(true);
    });
  });

  describe('getStagedDiff()', () => {
    it('returns empty string for clean repo', async () => {
      const diff = await gitOps.getStagedDiff();
      expect(diff).toBe('');
    });

    it('returns diff for staged changes', async () => {
      fs.writeFileSync(path.join(tempDir, 'file.ts'), 'const x = 1;');
      execSync('git add file.ts', { cwd: tempDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });

      fs.writeFileSync(path.join(tempDir, 'file.ts'), 'const x = 2;');
      execSync('git add file.ts', { cwd: tempDir, stdio: 'ignore' });

      const diff = await gitOps.getStagedDiff();
      expect(diff).toContain('x = 1');
      expect(diff).toContain('x = 2');
    });
  });

  describe('getStagedDiffForFile()', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(tempDir, 'target.ts'), 'original');
      execSync('git add target.ts', { cwd: tempDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });
    });

    it('returns diff for modified staged file', async () => {
      fs.writeFileSync(path.join(tempDir, 'target.ts'), 'modified');
      execSync('git add target.ts', { cwd: tempDir, stdio: 'ignore' });

      const diff = await gitOps.getStagedDiffForFile('target.ts');
      expect(diff.length).toBeGreaterThan(0);
      expect(diff).toContain('original');
    });

    it('returns empty string if file not staged', async () => {
      fs.writeFileSync(path.join(tempDir, 'target.ts'), 'unstaged change');

      const diff = await gitOps.getStagedDiffForFile('target.ts');
      expect(diff).toBe('');
    });

    it('handles file paths with special characters', async () => {
      const specialFile = path.join(tempDir, 'file with spaces.ts');
      fs.writeFileSync(specialFile, 'content');
      execSync('git add "file with spaces.ts"', { cwd: tempDir, stdio: 'ignore' });

      const diff = await gitOps.getStagedDiffForFile('file with spaces.ts');
      expect(typeof diff).toBe('string');
    });
  });

  describe('getFileChanges()', () => {
    it('includes staged files', async () => {
      fs.writeFileSync(path.join(tempDir, 'new.ts'), 'content');
      execSync('git add new.ts', { cwd: tempDir, stdio: 'ignore' });

      const changes = await gitOps.getFileChanges();
      expect(changes.some(c => c.path === 'new.ts')).toBe(true);
    });

    it('marks files with correct status', async () => {
      fs.writeFileSync(path.join(tempDir, 'file.ts'), 'initial');
      execSync('git add file.ts', { cwd: tempDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });

      fs.writeFileSync(path.join(tempDir, 'file.ts'), 'modified');
      execSync('git add file.ts', { cwd: tempDir, stdio: 'ignore' });

      const changes = await gitOps.getFileChanges();
      const fileChange = changes.find(c => c.path === 'file.ts');
      expect(fileChange?.status).toBe('modified');
    });
  });

  describe('getCommitHistory()', () => {
    beforeEach(() => {
      for (let i = 1; i <= 2; i++) {
        fs.writeFileSync(path.join(tempDir, `file${i}.ts`), `content ${i}`);
        execSync(`git add file${i}.ts`, { cwd: tempDir, stdio: 'ignore' });
        execSync(`git commit -m "commit ${i}"`, { cwd: tempDir, stdio: 'ignore' });
      }
    });

    it('returns commit history', async () => {
      const history = await gitOps.getCommitHistory(10);
      expect(history.length).toBe(2);
    });

    it('respects limit parameter', async () => {
      const history = await gitOps.getCommitHistory(1);
      expect(history.length).toBe(1);
    });

    it('returns commits with required properties', async () => {
      const history = await gitOps.getCommitHistory(1);
      expect(history[0]).toHaveProperty('hash');
      expect(history[0]).toHaveProperty('message');
      expect(history[0]).toHaveProperty('author');
    });
  });

  describe('getRepoRoot()', () => {
    it('returns repository root path', async () => {
      const root = await gitOps.getRepoRoot();
      expect(root).toBe(tempDir);
    });

    it('works from subdirectories', async () => {
      const subdir = path.join(tempDir, 'src', 'core');
      fs.mkdirSync(subdir, { recursive: true });

      const ops = new GitOperations(subdir);
      const root = await ops.getRepoRoot();
      expect(root).toBe(tempDir);
    });
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
