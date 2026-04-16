import { GitOperations } from './git.js';
import { getAIProvider } from '../ai/providers.js';
import { simpleGit, SimpleGit } from 'simple-git';

export interface ConflictPrediction {
  file: string;
  probability: number; // 0-1
  risk: 'low' | 'medium' | 'high';
  reason: string;
  suggestedAction: string;
}

export interface TeamConflictPattern {
  file: string;
  conflictFrequency: number;
  lastConflictDate: Date;
  commonAuthors: string[];
}

export interface ConflictPredictionReport {
  branch: string;
  predictions: ConflictPrediction[];
  overallRisk: 'low' | 'medium' | 'high';
  summary: string;
}

/**
 * Use AI to predict potential conflicts based on code patterns
 */
export async function predictConflictsWithAI(
  targetBranch: string,
  sourceBranch?: string
): Promise<ConflictPredictionReport> {
  const gitOps = new GitOperations();
  const repoRoot = await gitOps.getRepoRoot();
  const git = simpleGit(repoRoot);
  const currentBranch = sourceBranch || (await gitOps.getStatus()).branch;

  try {
    // Get changed files in both branches
    const mergeBase = await git.raw(['merge-base', targetBranch, currentBranch]);
    if (!mergeBase.trim()) {
      return {
        branch: currentBranch,
        predictions: [],
        overallRisk: 'low',
        summary: 'Branches have no common ancestor',
      };
    }

    const targetChanges = await git.raw(['diff', '--name-only', mergeBase.trim(), targetBranch]);
    const sourceChanges = await git.raw(['diff', '--name-only', mergeBase.trim(), currentBranch]);

    const targetFiles = targetChanges.trim().split('\n').filter(f => f);
    const sourceFiles = sourceChanges.trim().split('\n').filter(f => f);

    // Find overlapping files
    const overlappingFiles = targetFiles.filter(f => sourceFiles.includes(f));

    if (overlappingFiles.length === 0) {
      return {
        branch: currentBranch,
        predictions: [],
        overallRisk: 'low',
        summary: 'No overlapping file changes - low conflict probability',
      };
    }

    // Get AI provider
    const ai = getAIProvider();
    if (!ai) {
      return {
        branch: currentBranch,
        predictions: [],
        overallRisk: 'medium',
        summary: 'AI provider not configured - cannot predict conflicts',
      };
    }

    // Analyze each overlapping file with AI
    const predictions: ConflictPrediction[] = [];

    for (const file of overlappingFiles.slice(0, 10)) {
      // Limit to 10 files to avoid excessive API calls
      const prediction = await analyzeFileConflictWithAI(
        file,
        mergeBase.trim(),
        targetBranch,
        currentBranch,
        git
      );
      predictions.push(prediction);
    }

    // Calculate overall risk
    const highRiskCount = predictions.filter(p => p.risk === 'high').length;
    const mediumRiskCount = predictions.filter(p => p.risk === 'medium').length;

    let overallRisk: 'low' | 'medium' | 'high';
    let summary: string;

    if (highRiskCount > 0) {
      overallRisk = 'high';
      summary = `High conflict risk predicted. ${highRiskCount} file(s) likely to have conflicts.`;
    } else if (mediumRiskCount > 2) {
      overallRisk = 'medium';
      summary = `Moderate conflict risk. ${mediumRiskCount} file(s) may have conflicts.`;
    } else {
      overallRisk = 'low';
      summary = 'Low conflict risk predicted.';
    }

    return {
      branch: currentBranch,
      predictions,
      overallRisk,
      summary,
    };
  } catch (error) {
    return {
      branch: currentBranch,
      predictions: [],
      overallRisk: 'medium',
      summary: `Failed to predict conflicts: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Use AI to analyze a specific file for conflict potential
 */
async function analyzeFileConflictWithAI(
  file: string,
  mergeBase: string,
  branchA: string,
  branchB: string,
  git: SimpleGit
): Promise<ConflictPrediction> {
  // Get file content from both branches
  const baseContent = await git.show([`${mergeBase}:${file}`]).catch(() => '');
  const contentA = await git.show([`${branchA}:${file}`]).catch(() => '');
  const contentB = await git.show([`${branchB}:${file}`]).catch(() => '');

  if (!baseContent || !contentA || !contentB) {
    return {
      file,
      probability: 0.5,
      risk: 'medium',
      reason: 'File may be new or deleted in one branch',
      suggestedAction: 'Review file status manually',
    };
  }

  const ai = getAIProvider();
  if (!ai) {
    return {
      file,
      probability: 0.5,
      risk: 'medium',
      reason: 'AI not available for detailed analysis',
      suggestedAction: 'Review file manually',
    };
  }

  try {
    // Use AI to analyze conflict potential
    const prompt = `
Analyze the likelihood of merge conflicts for this file based on the changes in two branches.

File: ${file}

Base version (common ancestor):
${baseContent.slice(0, 2000)}${baseContent.length > 2000 ? '...' : ''}

Branch A changes:
${contentA.slice(0, 2000)}${contentA.length > 2000 ? '...' : ''}

Branch B changes:
${contentB.slice(0, 2000)}${contentB.length > 2000 ? '...' : ''}

Respond with a JSON object:
{
  "probability": 0.0-1.0,
  "risk": "low|medium|high",
  "reason": "brief explanation",
  "suggestedAction": "what to do to avoid conflicts"
}
`;

    const response = await ai.generate(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        file,
        probability: parsed.probability || 0.5,
        risk: parsed.risk || 'medium',
        reason: parsed.reason || 'Unable to determine',
        suggestedAction: parsed.suggestedAction || 'Review manually',
      };
    }
  } catch {
    // Fallback to simple analysis
  }

  // Fallback: simple line-based analysis
  const linesA = contentA.split('\n');
  const linesB = contentB.split('\n');
  const baseLines = baseContent.split('\n');

  let changedLinesA = 0;
  let changedLinesB = 0;
  let overlappingChanges = 0;

  for (let i = 0; i < Math.max(baseLines.length, linesA.length, linesB.length); i++) {
    const baseLine = baseLines[i] || '';
    const lineA = linesA[i] || '';
    const lineB = linesB[i] || '';

    if (lineA !== baseLine) changedLinesA++;
    if (lineB !== baseLine) changedLinesB++;
    if (lineA !== baseLine && lineB !== baseLine && lineA !== lineB) {
      overlappingChanges++;
    }
  }

  const probability = overlappingChanges > 0 
    ? Math.min(overlappingChanges / Math.max(changedLinesA, changedLinesB), 1)
    : 0.1;

  let risk: 'low' | 'medium' | 'high';
  let reason: string;
  let suggestedAction: string;

  if (probability > 0.5) {
    risk = 'high';
    reason = `${overlappingChanges} lines changed in both branches`;
    suggestedAction = 'Coordinate with team to resolve overlapping changes';
  } else if (probability > 0.2) {
    risk = 'medium';
    reason = 'Some overlapping changes detected';
    suggestedAction = 'Review changes carefully before merging';
  } else {
    risk = 'low';
    reason = 'Minimal overlapping changes';
    suggestedAction = 'Standard merge should work';
  }

  return {
    file,
    probability,
    risk,
    reason,
    suggestedAction,
  };
}

/**
 * Learn from past conflicts to improve future predictions
 */
export async function learnFromPastConflicts(): Promise<TeamConflictPattern[]> {
  const gitOps = new GitOperations();
  const repoRoot = await gitOps.getRepoRoot();
  const git = simpleGit(repoRoot);

  try {
    // Look for merge commits that had conflicts
    const logResult = await git.log(['--merges', '-n', '100', '--format=%H|%s|%an|%ai']);

    const patterns: Map<string, TeamConflictPattern> = new Map();

    // Parse custom format: hash|message|author|date
    for (const entry of logResult.all) {
      try {
        // Parse the message which contains our custom format
        const parts = entry.message.split('|');
        if (parts.length >= 4) {
          const hash = parts[0];
          const author = parts[2];
          const date = parts[3];

          // Get the files changed in this merge
          const diff = await git.diff([`${hash}^1`, `${hash}^2`, '--name-only']);
          const files = diff.trim().split('\n').filter(f => f);

          for (const file of files) {
            if (!patterns.has(file)) {
              patterns.set(file, {
                file,
                conflictFrequency: 1,
                lastConflictDate: new Date(date),
                commonAuthors: [author || 'Unknown'],
              });
            } else {
              const pattern = patterns.get(file)!;
              pattern.conflictFrequency++;
              const entryDate = new Date(date);
              if (entryDate > pattern.lastConflictDate) {
                pattern.lastConflictDate = entryDate;
              }
              if (author && !pattern.commonAuthors.includes(author)) {
                pattern.commonAuthors.push(author);
              }
            }
          }
        }
      } catch {
        // Skip this merge if analysis fails
      }
    }

    return Array.from(patterns.values()).sort((a, b) => b.conflictFrequency - a.conflictFrequency);
  } catch (error) {
    throw new Error(`Failed to learn from past conflicts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default {
  predictConflictsWithAI,
  learnFromPastConflicts,
};
