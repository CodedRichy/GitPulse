import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitShield, GitShieldError } from '../git-shield.js';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit } from 'simple-git';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('GitShield', () => {
  let testDir: string;
  let shield: GitShield;

  beforeEach(async () => {
    // Use unique test directory per test
    testDir = path.join(__dirname, `.test-repo-${Date.now()}-${Math.random().toString(36).substring(7)}`);

    // Create fresh test repo
    fs.mkdirSync(testDir, { recursive: true });

    // Initialize fresh git repo
    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Create initial commit
    fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
    await git.add('README.md');
    await git.commit('Initial commit');

    shield = new GitShield(testDir);
  });

  afterEach(() => {
    // Cleanup test repo
    try {
      if (testDir && fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors on Windows
    }
  });

  describe('Clean State', () => {
    it('should return safe for clean repo state', async () => {
      const result = await shield.checkState();
      
      expect(result.safe).toBe(true);
      expect(result.state).toBe('clean');
    });

    it('should not throw for clean state in assertSafeState', async () => {
      await expect(shield.assertSafeState()).resolves.not.toThrow();
    });
  });

  describe('Rebase Detection', () => {
    it('should detect rebase in progress (REBASE_HEAD)', async () => {
      // Create REBASE_HEAD file to simulate rebase
      const rebaseHead = path.join(testDir, '.git', 'REBASE_HEAD');
      fs.writeFileSync(rebaseHead, 'abc123');
      
      const result = await shield.checkState();
      
      expect(result.safe).toBe(false);
      expect(result.state).toBe('rebase');
      expect(result.message).toContain('Rebase in progress');
      expect(result.action).toContain('git rebase --continue');
    });

    it('should detect rebase in progress (rebase-merge directory)', async () => {
      const rebaseDir = path.join(testDir, '.git', 'rebase-merge');
      fs.mkdirSync(rebaseDir, { recursive: true });
      
      const result = await shield.checkState();
      
      expect(result.safe).toBe(false);
      expect(result.state).toBe('rebase');
    });

    it('should throw GitShieldError for rebase state', async () => {
      const rebaseHead = path.join(testDir, '.git', 'REBASE_HEAD');
      fs.writeFileSync(rebaseHead, 'abc123');
      
      await expect(shield.assertSafeState()).rejects.toThrow(GitShieldError);
    });
  });

  describe('Merge Conflict Detection', () => {
    it('should detect merge in progress (MERGE_HEAD)', async () => {
      const mergeHead = path.join(testDir, '.git', 'MERGE_HEAD');
      fs.writeFileSync(mergeHead, 'def456');

      const result = await shield.checkState();

      expect(result.safe).toBe(false);
      expect(result.state).toBe('merge');
      expect(result.message).toContain('Merge in progress');
      expect(result.action).toContain('git merge --continue');
    });

    it('should throw GitShieldError for merge state', async () => {
      const mergeHead = path.join(testDir, '.git', 'MERGE_HEAD');
      fs.writeFileSync(mergeHead, 'def456');
      
      await expect(shield.assertSafeState()).rejects.toThrow(GitShieldError);
      
      try {
        await shield.assertSafeState();
      } catch (error) {
        expect(error).toBeInstanceOf(GitShieldError);
        expect((error as GitShieldError).state).toBe('merge');
        expect((error as GitShieldError).action).toContain('git merge');
      }
    });
  });

  describe('Cherry-Pick Detection', () => {
    it('should detect cherry-pick in progress', async () => {
      const cherryPickHead = path.join(testDir, '.git', 'CHERRY_PICK_HEAD');
      fs.writeFileSync(cherryPickHead, 'ghi789');
      
      const result = await shield.checkState();
      
      expect(result.safe).toBe(false);
      expect(result.state).toBe('cherry-pick');
      expect(result.message).toContain('Cherry-pick in progress');
    });
  });

  describe('Revert Detection', () => {
    it('should detect revert in progress', async () => {
      const revertHead = path.join(testDir, '.git', 'REVERT_HEAD');
      fs.writeFileSync(revertHead, 'jkl012');

      const result = await shield.checkState();

      expect(result.safe).toBe(false);
      expect(result.state).toBe('revert');
      expect(result.message).toContain('Revert in progress');
    });
  });

  describe('Bisect Detection', () => {
    it('should detect bisect in progress', async () => {
      const bisectLog = path.join(testDir, '.git', 'BISECT_LOG');
      fs.writeFileSync(bisectLog, 'mno345');

      const result = await shield.checkState();

      expect(result.safe).toBe(false);
      expect(result.state).toBe('bisect');
      expect(result.message).toContain('Bisect in progress');
    });
  });

  describe('Detached HEAD Detection', () => {
    it('should detect detached HEAD state', async () => {
      const git = simpleGit(testDir);

      // Get the current branch name
      const branchResult = await git.revparse(['--abbrev-ref', 'HEAD']);
      const currentBranch = branchResult.trim();

      // Get the current commit hash
      const log = await git.log({ maxCount: 1 });
      const commitHash = log.latest?.hash;

      if (!commitHash) {
        throw new Error('No commit hash found');
      }

      // Checkout the commit directly to enter detached HEAD state
      await git.checkout(commitHash);

      const result = await shield.checkState();

      // Restore to branch state
      await git.checkout(currentBranch);

      expect(result.safe).toBe(false);
      expect(result.state).toBe('detached-head');
      expect(result.message).toContain('Detached HEAD');
      expect(result.action).toContain('git checkout -b');
    });
  });

  describe('GitShieldError', () => {
    it('should format error message with action', () => {
      const error = new GitShieldError(
        'GitPulse: Rebase in progress.',
        'rebase',
        "Run 'git rebase --continue'"
      );
      
      expect(error.name).toBe('GitShieldError');
      expect(error.state).toBe('rebase');
      expect(error.action).toBe("Run 'git rebase --continue'");
      expect(error.toString()).toContain('GitPulse: Rebase in progress');
      expect(error.toString()).toContain('git rebase --continue');
    });
  });
});
