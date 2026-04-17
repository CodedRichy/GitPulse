import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';

/**
 * Git-Shield: Git State Detection Module
 * 
 * Prevents GitPulse from operating in unsafe git states that could
 * corrupt the repository or cause data loss.
 * 
 * The "Oh Shit" Prevention Layer:
 * - Prevents commits during rebase (would corrupt rebase sequence)
 * - Prevents commits during merge conflicts (would embed conflict markers)
 * - Prevents commits during cherry-pick (would corrupt cherry-pick state)
 * - Prevents commits in detached HEAD (commits would be lost)
 * - Prevents commits with unmerged files (would embed conflict markers)
 * 
 * Action: Abort with clear, actionable error message if unsafe state detected.
 */

export interface GitStateCheck {
  safe: boolean;
  state: GitState;
  message: string;
  action: string;
}

export type GitState =
  | 'clean'
  | 'rebase'
  | 'merge'
  | 'cherry-pick'
  | 'revert'
  | 'bisect'
  | 'detached-head'
  | 'unmerged-files';

export class GitShield {
  private git: SimpleGit;
  private gitDir: string;

  constructor(repoPath: string = '.') {
    this.git = simpleGit(repoPath);
    this.gitDir = path.join(repoPath, '.git');
  }

  /**
   * Check if the repository is in a safe state for gitpulse operations
   */
  async checkState(): Promise<GitStateCheck> {
    // Check for various "dirty" states in order of severity
    const checks = [
      this.checkRebase(),
      this.checkMerge(),
      this.checkCherryPick(),
      this.checkRevert(),
      this.checkBisect(),
      this.checkDetachedHead(),
      this.checkUnmergedFiles(),
    ];

    for (const check of checks) {
      const result = await check;
      if (!result.safe) {
        return result;
      }
    }

    return {
      safe: true,
      state: 'clean',
      message: 'Repository is in a safe state',
      action: 'Proceed with gitpulse operation',
    };
  }

  /**
   * Assert that the repository is in a safe state
   * Throws error if unsafe state detected
   */
  async assertSafeState(): Promise<void> {
    const check = await this.checkState();
    if (!check.safe) {
      throw new GitShieldError(check.message, check.state, check.action);
    }
  }

  /**
   * Check if a rebase is in progress
   */
  private async checkRebase(): Promise<GitStateCheck> {
    // Check for rebase-merge directory (interactive rebase)
    const rebaseMergeDir = path.join(this.gitDir, 'rebase-merge');
    const rebaseApplyDir = path.join(this.gitDir, 'rebase-apply');
    const rebaseHead = path.join(this.gitDir, 'REBASE_HEAD');

    const isRebase = 
      fs.existsSync(rebaseMergeDir) ||
      fs.existsSync(rebaseApplyDir) ||
      fs.existsSync(rebaseHead);

    if (isRebase) {
      return {
        safe: false,
        state: 'rebase',
        message: 'GitPulse: Rebase in progress. Cannot commit during rebase.',
        action: "Resolve conflicts, then run 'git rebase --continue' or 'git rebase --abort'",
      };
    }

    return { safe: true, state: 'clean', message: '', action: '' };
  }

  /**
   * Check if a merge is in progress (with conflicts)
   */
  private async checkMerge(): Promise<GitStateCheck> {
    const mergeHead = path.join(this.gitDir, 'MERGE_HEAD');

    if (fs.existsSync(mergeHead)) {
      return {
        safe: false,
        state: 'merge',
        message: 'GitPulse: Merge in progress with unresolved conflicts.',
        action: "Resolve conflicts, then run 'git merge --continue' or 'git merge --abort'",
      };
    }

    return { safe: true, state: 'clean', message: '', action: '' };
  }

  /**
   * Check if a cherry-pick is in progress
   */
  private async checkCherryPick(): Promise<GitStateCheck> {
    const cherryPickHead = path.join(this.gitDir, 'CHERRY_PICK_HEAD');

    if (fs.existsSync(cherryPickHead)) {
      return {
        safe: false,
        state: 'cherry-pick',
        message: 'GitPulse: Cherry-pick in progress. Cannot commit during cherry-pick.',
        action: "Resolve conflicts, then run 'git cherry-pick --continue' or 'git cherry-pick --abort'",
      };
    }

    return { safe: true, state: 'clean', message: '', action: '' };
  }

  /**
   * Check if a revert is in progress
   */
  private async checkRevert(): Promise<GitStateCheck> {
    const revertHead = path.join(this.gitDir, 'REVERT_HEAD');

    if (fs.existsSync(revertHead)) {
      return {
        safe: false,
        state: 'revert',
        message: 'GitPulse: Revert in progress. Cannot commit during revert.',
        action: "Resolve conflicts, then run 'git revert --continue' or 'git revert --abort'",
      };
    }

    return { safe: true, state: 'clean', message: '', action: '' };
  }

  /**
   * Check if a bisect is in progress
   */
  private async checkBisect(): Promise<GitStateCheck> {
    const bisectLog = path.join(this.gitDir, 'BISECT_LOG');

    if (fs.existsSync(bisectLog)) {
      return {
        safe: false,
        state: 'bisect',
        message: 'GitPulse: Bisect in progress. Cannot commit during bisect.',
        action: "Run 'git bisect reset' to end the bisect session",
      };
    }

    return { safe: true, state: 'clean', message: '', action: '' };
  }

  /**
   * Check if we're in detached HEAD state
   */
  private async checkDetachedHead(): Promise<GitStateCheck> {
    try {
      const result = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      const branch = result.trim();

      if (branch === 'HEAD') {
        return {
          safe: false,
          state: 'detached-head',
          message: 'GitPulse: Detached HEAD state. Commits would be lost.',
          action: "Create a branch first: 'git checkout -b temp-branch' or checkout an existing branch",
        };
      }
    } catch {
      // If we can't determine branch, assume it's unsafe
      return {
        safe: false,
        state: 'detached-head',
        message: 'GitPulse: Unable to determine current branch.',
        action: "Check your git state with 'git status'",
      };
    }

    return { safe: true, state: 'clean', message: '', action: '' };
  }

  /**
   * Check for unmerged files (conflict markers present)
   */
  private async checkUnmergedFiles(): Promise<GitStateCheck> {
    try {
      const statusResult = await this.git.status();
      
      // Check for files in conflict state
      const unmergedFiles: string[] = [];
      
      // simple-git provides 'conflicted' array for files with merge conflicts
      if (statusResult.conflicted && statusResult.conflicted.length > 0) {
        unmergedFiles.push(...statusResult.conflicted);
      }

      if (unmergedFiles.length > 0) {
        const files = unmergedFiles.join(', ');
        return {
          safe: false,
          state: 'unmerged-files',
          message: `GitPulse: Unmerged files with conflicts: ${files}`,
          action: "Resolve conflicts in these files, then stage and commit manually",
        };
      }
    } catch {
      // If status check fails, we'll be cautious and allow operation
      // (other checks should catch any real problems)
    }

    return { safe: true, state: 'clean', message: '', action: '' };
  }
}

/**
 * Custom error class for GitShield violations
 */
export class GitShieldError extends Error {
  public readonly state: GitState;
  public readonly action: string;

  constructor(message: string, state: GitState, action: string) {
    super(message);
    this.name = 'GitShieldError';
    this.state = state;
    this.action = action;
  }

  toString(): string {
    return `${this.message}\n\n${this.action}`;
  }
}

export default GitShield;
