import { simpleGit, SimpleGit } from 'simple-git';
import { GitOperations } from './git.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ConflictPrediction {
  file: string;
  risk: 'low' | 'medium' | 'high';
  reason: string;
  conflictingLines?: number;
}

export interface BranchConflictAnalysis {
  branch: string;
  baseBranch: string;
  hasConflicts: boolean;
  predictions: ConflictPrediction[];
  recommendation: string;
}

/**
 * Detect potential merge conflicts before actually merging
 */
export async function detectPotentialConflicts(
  targetBranch: string,
  sourceBranch?: string
): Promise<BranchConflictAnalysis> {
  const gitOps = new GitOperations();
  const isRepo = await gitOps.isRepo();

  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  const currentBranch = sourceBranch || (await gitOps.getStatus()).branch;
  const baseBranch = targetBranch;
  const repoRoot = await gitOps.getRepoRoot();
  const git = simpleGit(repoRoot);

  // Get the merge base (common ancestor)
  try {
    const mergeBaseResult = await git.raw(['merge-base', baseBranch, currentBranch]);
    const mergeBase = mergeBaseResult.trim();
    
    if (!mergeBase) {
      return {
        branch: currentBranch,
        baseBranch,
        hasConflicts: false,
        predictions: [],
        recommendation: 'Branches have no common ancestor or are already merged',
      };
    }

    // Get files changed in both branches since merge base
    const baseChanges = await getChangedFilesSince(mergeBase, baseBranch, repoRoot);
    const currentChanges = await getChangedFilesSince(mergeBase, currentBranch, repoRoot);

    // Find overlapping files
    const overlappingFiles = findOverlappingFiles(baseChanges, currentChanges);

    if (overlappingFiles.length === 0) {
      return {
        branch: currentBranch,
        baseBranch,
        hasConflicts: false,
        predictions: [],
        recommendation: 'No overlapping file changes - safe to merge',
      };
    }

    // Analyze each overlapping file for conflict risk
    const predictions: ConflictPrediction[] = [];

    for (const file of overlappingFiles) {
      const prediction = await analyzeFileConflictRisk(
        file,
        mergeBase,
        baseBranch,
        currentBranch,
        repoRoot
      );
      predictions.push(prediction);
    }

    const hasHighRisk = predictions.some(p => p.risk === 'high');
    const hasMediumRisk = predictions.some(p => p.risk === 'medium');

    let recommendation: string;
    if (hasHighRisk) {
      recommendation = 'High conflict risk detected. Consider resolving conflicts manually or coordinating with team.';
    } else if (hasMediumRisk) {
      recommendation = 'Medium conflict risk. Review overlapping files before merging.';
    } else {
      recommendation = 'Low conflict risk. Merge should proceed smoothly.';
    }

    return {
      branch: currentBranch,
      baseBranch,
      hasConflicts: hasHighRisk || hasMediumRisk,
      predictions,
      recommendation,
    };
  } catch (error) {
    throw new Error(`Failed to detect conflicts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get files changed since a commit
 */
async function getChangedFilesSince(sinceCommit: string, branch: string, repoRoot: string): Promise<string[]> {
  const git = simpleGit(repoRoot);
  const result = await git.raw(['diff', '--name-only', sinceCommit, branch]);
  return result.trim().split('\n').filter((f: string) => f);
}

/**
 * Find files that were changed in both branches
 */
function findOverlappingFiles(filesA: string[], filesB: string[]): string[] {
  const setA = new Set(filesA);
  return filesB.filter(f => setA.has(f));
}

/**
 * Analyze conflict risk for a specific file
 */
async function analyzeFileConflictRisk(
  file: string,
  mergeBase: string,
  branchA: string,
  branchB: string,
  repoRoot: string
): Promise<ConflictPrediction> {
  const git = simpleGit(repoRoot);
  const filePath = path.join(repoRoot, file);

  try {
    // Get file content from both branches and merge base
    const baseContent = await getFileContentAtCommit(mergeBase, file, git);
    const contentA = await getFileContentAtCommit(branchA, file, git);
    const contentB = await getFileContentAtCommit(branchB, file, git);

    // Calculate line changes
    const baseLines = baseContent.split('\n');
    const linesA = contentA.split('\n');
    const linesB = contentB.split('\n');

    // Find conflicting line ranges
    const conflicts = findConflictingLineRanges(baseLines, linesA, linesB);

    if (conflicts.length === 0) {
      return {
        file,
        risk: 'low',
        reason: 'Changes are in different line ranges',
      };
    }

    const conflictingLines = conflicts.reduce((sum, c) => sum + (c.end - c.start), 0);

    if (conflictingLines > 20) {
      return {
        file,
        risk: 'high',
        reason: 'Large number of conflicting line changes',
        conflictingLines,
      };
    } else if (conflictingLines > 5) {
      return {
        file,
        risk: 'medium',
        reason: 'Moderate number of conflicting line changes',
        conflictingLines,
      };
    }

    return {
      file,
      risk: 'low',
      reason: 'Few conflicting lines',
      conflictingLines,
    };
  } catch {
    return {
      file,
      risk: 'medium',
      reason: 'Unable to analyze file content - file may be new or deleted',
    };
  }
}

/**
 * Get file content at a specific commit
 */
async function getFileContentAtCommit(commit: string, file: string, git: SimpleGit): Promise<string> {
  try {
    const result = await git.show([`${commit}:${file}`]);
    return result;
  } catch {
    return ''; // File may not exist at this commit
  }
}

/**
 * Find line ranges that conflict between two versions
 */
function findConflictingLineRanges(base: string[], versionA: string[], versionB: string[]): Array<{ start: number; end: number }> {
  const conflicts: Array<{ start: number; end: number }> = [];
  const maxLength = Math.max(base.length, versionA.length, versionB.length);

  for (let i = 0; i < maxLength; i++) {
    const lineBase = base[i] || '';
    const lineA = versionA[i] || '';
    const lineB = versionB[i] || '';

    // If both A and B changed the same line differently from base
    if (lineA !== lineBase && lineB !== lineBase && lineA !== lineB) {
      // Start of a conflict
      if (conflicts.length === 0 || conflicts[conflicts.length - 1].end < i - 1) {
        conflicts.push({ start: i, end: i });
      } else {
        // Extend existing conflict
        conflicts[conflicts.length - 1].end = i;
      }
    }
  }

  return conflicts;
}

/**
 * Simulate a merge to detect actual conflicts (without applying)
 */
export async function simulateMerge(targetBranch: string, sourceBranch?: string): Promise<{
  canMerge: boolean;
  conflictFiles: string[];
  error?: string;
}> {
  const gitOps = new GitOperations();
  const repoRoot = await gitOps.getRepoRoot();
  const git = simpleGit(repoRoot);
  const currentBranch = sourceBranch || (await gitOps.getStatus()).branch;

  try {
    // Try a dry-run merge
    await git.merge(['--no-commit', '--no-ff', targetBranch]);

    // Check for conflicts
    const status = await gitOps.getStatus();
    const conflictFiles = [...status.staged, ...status.unstaged].filter((f: string) => {
      const filePath = path.join(repoRoot, f);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.includes('<<<<<<<') && content.includes('=======') && content.includes('>>>>>>>');
      }
      return false;
    });

    // Abort the merge
    await git.merge(['--abort']);

    return {
      canMerge: conflictFiles.length === 0,
      conflictFiles,
    };
  } catch (error) {
    // Abort any partial merge
    try {
      await git.merge(['--abort']);
    } catch {}

    return {
      canMerge: false,
      conflictFiles: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default {
  detectPotentialConflicts,
  simulateMerge,
};
