import { GitOperations } from './git.js';
import { simpleGit, SimpleGit } from 'simple-git';

export interface BranchContributor {
  name: string;
  email: string;
  lastCommitDate: Date;
  commitCount: number;
}

export interface BranchActivity {
  branch: string;
  contributors: BranchContributor[];
  lastCommitDate: Date;
  totalCommits: number;
  isShared: boolean;
}

export interface BranchConflictRisk {
  branch: string;
  risk: 'low' | 'medium' | 'high';
  reason: string;
  contributors?: BranchContributor[];
}

/**
 * Get branch activity information to detect if multiple developers are working on the same branch
 */
export async function getBranchActivity(branch: string): Promise<BranchActivity> {
  const gitOps = new GitOperations();
  const repoRoot = await gitOps.getRepoRoot();
  const git = simpleGit(repoRoot);

  try {
    // Get recent commits for the branch
    const log = await git.log({
      branch,
      n: 50, // Last 50 commits
      format: {
        hash: '%H',
        message: '%s',
        author: '%an',
        email: '%ae',
        date: '%ai'
      }
    });

    // Aggregate commits by author
    const contributorMap = new Map<string, BranchContributor>();

    for (const entry of log.all) {
      const author = entry.author || 'Unknown';
      const email = entry.email || 'unknown@example.com';
      const key = `${author}:${email}`;

      if (!contributorMap.has(key)) {
        contributorMap.set(key, {
          name: author,
          email,
          lastCommitDate: new Date(entry.date),
          commitCount: 1,
        });
      } else {
        const contributor = contributorMap.get(key)!;
        contributor.commitCount++;
        const entryDate = new Date(entry.date);
        if (entryDate > contributor.lastCommitDate) {
          contributor.lastCommitDate = entryDate;
        }
      }
    }

    const contributors = Array.from(contributorMap.values());
    const totalCommits = log.all.length;
    const lastCommitDate = log.all.length > 0 ? new Date(log.all[0].date) : new Date();
    const isShared = contributors.length > 1;

    return {
      branch,
      contributors,
      lastCommitDate,
      totalCommits,
      isShared,
    };
  } catch (error) {
    throw new Error(`Failed to get branch activity: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Analyze conflict risk for a branch based on contributor activity
 */
export async function analyzeBranchConflictRisk(branch: string): Promise<BranchConflictRisk> {
  try {
    const activity = await getBranchActivity(branch);

    if (!activity.isShared) {
      return {
        branch,
        risk: 'low',
        reason: 'Single developer working on this branch',
        contributors: activity.contributors,
      };
    }

    // If multiple contributors, assess risk based on recent activity
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeContributors = activity.contributors.filter(
      c => c.lastCommitDate > oneDayAgo
    );

    if (activeContributors.length > 2) {
      return {
        branch,
        risk: 'high',
        reason: `${activeContributors.length} developers actively working on this branch in the last 24 hours`,
        contributors: activity.contributors,
      };
    }

    if (activeContributors.length === 2) {
      return {
        branch,
        risk: 'medium',
        reason: '2 developers actively working on this branch',
        contributors: activity.contributors,
      };
    }

    const recentContributors = activity.contributors.filter(
      c => c.lastCommitDate > oneWeekAgo
    );

    if (recentContributors.length > 2) {
      return {
        branch,
        risk: 'medium',
        reason: 'Multiple contributors in the last week, but not currently active',
        contributors: activity.contributors,
      };
    }

    return {
      branch,
      risk: 'low',
      reason: 'Multiple contributors but low recent activity',
      contributors: activity.contributors,
    };
  } catch (error) {
    return {
      branch,
      risk: 'low',
      reason: 'Unable to analyze branch activity',
    };
  }
}

/**
 * Get all branches with their conflict risk assessment
 */
export async function getAllBranchesRiskAnalysis(): Promise<BranchConflictRisk[]> {
  const gitOps = new GitOperations();
  const repoRoot = await gitOps.getRepoRoot();
  const git = simpleGit(repoRoot);

  try {
    const branches = await git.branch();
    const branchNames = branches.all;

    const analyses: BranchConflictRisk[] = [];

    for (const branch of branchNames) {
      const analysis = await analyzeBranchConflictRisk(branch);
      analyses.push(analysis);
    }

    // Sort by risk (high first)
    analyses.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.risk] - riskOrder[b.risk];
    });

    return analyses;
  } catch (error) {
    throw new Error(`Failed to analyze branches: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if someone else has pushed to the current branch since last pull
 */
export async function checkRemoteUpdates(): Promise<{
  hasUpdates: boolean;
  ahead: number;
  behind: number;
  lastRemoteCommit?: {
    author: string;
    message: string;
    date: Date;
  };
}> {
  const gitOps = new GitOperations();
  const status = await gitOps.getStatus();

  if (status.behind === 0) {
    return {
      hasUpdates: false,
      ahead: status.ahead,
      behind: 0,
    };
  }

  // Get the last remote commit
  const repoRoot = await gitOps.getRepoRoot();
  const git = simpleGit(repoRoot);
  const currentBranch = status.branch;

  try {
    const log = await git.log({
      branch: `origin/${currentBranch}`,
      n: 1,
      format: {
        author: '%an',
        message: '%s',
        date: '%ai'
      }
    });

    if (log.all.length > 0) {
      return {
        hasUpdates: true,
        ahead: status.ahead,
        behind: status.behind,
        lastRemoteCommit: {
          author: log.all[0].author || 'Unknown',
          message: log.all[0].message,
          date: new Date(log.all[0].date),
        },
      };
    }
  } catch {
    // Branch might not exist on remote
  }

  return {
    hasUpdates: status.behind > 0,
    ahead: status.ahead,
    behind: status.behind,
  };
}

export default {
  getBranchActivity,
  analyzeBranchConflictRisk,
  getAllBranchesRiskAnalysis,
  checkRemoteUpdates,
};
