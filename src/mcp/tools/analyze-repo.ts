import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GitOperations } from '../../core/git.js';

export const analyzeRepoTool: Tool = {
  name: 'analyze_repo',
  description: 'Analyze repository status, health, and metrics. Returns branch info, staged/unstaged/untracked file counts, sync status, and a health score.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
    },
  },
};

function calculateHealthScore(status: { unstaged: string[]; untracked: string[]; behind: number; ahead: number }): number {
  let score = 100;
  if (status.unstaged.length > 0) score -= 10;
  if (status.untracked.length > 0) score -= 5;
  if (status.behind > 0) score -= 15;
  if (status.ahead > 10) score -= 10;
  return Math.max(0, score);
}

export async function handleAnalyzeRepo(args: Record<string, unknown>) {
  const repoPath = (args?.path as string) || '.';
  const gitOps = new GitOperations(repoPath);
  const status = await gitOps.getStatus();
  const isRepo = await gitOps.isRepo();

  const analysis = {
    isRepository: isRepo,
    branch: status.branch,
    status: {
      staged: status.staged.length,
      unstaged: status.unstaged.length,
      untracked: status.untracked.length,
      isClean: status.isClean,
    },
    sync: {
      ahead: status.ahead,
      behind: status.behind,
    },
    health: calculateHealthScore(status),
  };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
  };
}
