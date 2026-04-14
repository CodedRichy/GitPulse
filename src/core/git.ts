import { simpleGit, SimpleGit, StatusResult } from 'simple-git';
import { RepoStatus, FileChange, CommitInfo, DiffStats } from './models.js';
import * as path from 'path';

export class GitOperations {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string = '.') {
    this.repoPath = path.resolve(repoPath);
    this.git = simpleGit(this.repoPath);
  }

  /**
   * Check if the current directory is a git repository
   */
  async isRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current repository status
   */
  async getStatus(): Promise<RepoStatus> {
    const status: StatusResult = await this.git.status();
    
    return {
      staged: [...status.staged],
      unstaged: [...status.modified, ...status.deleted].filter((f: string) => !status.staged.includes(f)),
      untracked: [...status.not_added],
      branch: status.current || 'HEAD',
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      isClean: status.isClean()
    };
  }

  /**
   * Get diff for staged files
   */
  async getStagedDiff(): Promise<string> {
    const diff = await this.git.diff(['--cached']);
    return diff || '';
  }

  /**
   * Get diff for a specific staged file
   */
  async getStagedDiffForFile(filePath: string): Promise<string> {
    const diff = await this.git.diff(['--cached', '--', filePath]);
    return diff || '';
  }

  /**
   * Get diff for unstaged files
   */
  async getUnstagedDiff(): Promise<string> {
    const diff = await this.git.diff();
    return diff || '';
  }

  /**
   * Get detailed file changes
   */
  async getFileChanges(): Promise<FileChange[]> {
    const status: StatusResult = await this.git.status();
    const changes: FileChange[] = [];

    // Staged files
    for (const file of status.staged) {
      const diff = await this.git.diff(['--cached', '--', file]);
      const stats = this.parseDiffStats(diff || '');
      changes.push({
        path: file,
        status: status.created.includes(file) ? 'added' : 'modified',
        additions: stats.additions,
        deletions: stats.deletions,
        diff: diff || undefined
      });
    }

    // Unstaged modified files
    for (const file of status.modified.filter((f: string) => !status.staged.includes(f))) {
      const diff = await this.git.diff(['--', file]);
      const stats = this.parseDiffStats(diff || '');
      changes.push({
        path: file,
        status: 'modified',
        additions: stats.additions,
        deletions: stats.deletions,
        diff: diff || undefined
      });
    }

    // Untracked files
    for (const file of status.not_added) {
      changes.push({
        path: file,
        status: 'untracked',
        additions: 0,
        deletions: 0
      });
    }

    return changes;
  }

  /**
   * Get commit history for a file
   */
  async getFileHistory(filePath: string, limit: number = 10): Promise<CommitInfo[]> {
    const log = await this.git.log({
      file: filePath,
      n: limit,
      format: {
        hash: '%H',
        message: '%s',
        author: '%an',
        date: '%ai'
      }
    });

    return log.all.map(entry => ({
      hash: entry.hash,
      message: entry.message,
      author: entry.author || 'Unknown',
      date: new Date(entry.date),
      files: []
    }));
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(limit: number = 20): Promise<CommitInfo[]> {
    const log = await this.git.log({
      n: limit,
      format: {
        hash: '%H',
        message: '%s',
        author: '%an',
        date: '%ai'
      }
    });

    return log.all.map(entry => ({
      hash: entry.hash,
      message: entry.message,
      author: entry.author || 'Unknown',
      date: new Date(entry.date),
      files: (entry.diff?.files || []).map((f: { file: string }) => f.file)
    }));
  }

  /**
   * Stage files
   */
  async stage(files: string[]): Promise<void> {
    await this.git.add(files);
  }

  /**
   * Stage all changes (unstaged and untracked)
   */
  async stageAll(): Promise<void> {
    await this.git.add(['-A']);
  }

  /**
   * Unstage files
   */
  async unstage(files: string[]): Promise<void> {
    await this.git.reset(['--', ...files]);
  }

  /**
   * Create a commit
   */
  async commit(message: string): Promise<string> {
    const result = await this.git.commit(message);
    return result.commit || '';
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'HEAD';
  }

  /**
   * Get repository root path
   */
  async getRepoRoot(): Promise<string> {
    const result = await this.git.revparse(['--show-toplevel']);
    return result.trim();
  }

  /**
   * Undo last commit (reset to HEAD~1)
   */
  async undoCommit(): Promise<string> {
    const result = await this.git.reset(['--hard', 'HEAD~1']);
    return 'Commit undone';
  }

  /**
   * Redo last undone commit
   */
  async redoCommit(): Promise<string> {
    const result = await this.git.reset(['--hard', 'HEAD@{1}']);
    return 'Commit redone';
  }

  /**
   * Parse diff to get line statistics
   */
  private parseDiffStats(diff: string): { additions: number; deletions: number } {
    const lines = diff.split('\n');
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }

    return { additions, deletions };
  }

  /**
   * Get diff statistics for staged changes
   */
  async getStagedStats(): Promise<DiffStats> {
    const diff = await this.git.diff(['--cached', '--stat']);
    return this.parseDiffStat(diff || '');
  }

  /**
   * Parse git diff --stat output
   */
  private parseDiffStat(stat: string): DiffStats {
    const lines = stat.split('\n').filter(l => l.includes('|'));
    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;
    const fileStats = new Map<string, { additions: number; deletions: number }>();

    for (const line of lines) {
      const match = line.match(/(.+)\s*\|\s*(\d+)\s*([\+\-]*)/);
      if (match) {
        filesChanged++;
        const file = match[1].trim();
        const changes = match[3] || '';
        const plusCount = (changes.match(/\+/g) || []).length;
        const minusCount = (changes.match(/-/g) || []).length;
        
        insertions += plusCount;
        deletions += minusCount;
        fileStats.set(file, { additions: plusCount, deletions: minusCount });
      }
    }

    return { filesChanged, insertions, deletions, fileStats };
  }
}

export default GitOperations;
