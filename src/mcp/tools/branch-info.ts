import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GitOperations } from '../../core/git.js';
import { validateRepoPath } from '../../core/path-security.js';

export const branchInfoTool: Tool = {
  name: 'get_branch_info',
  description: 'Get current branch information including name, sync status (ahead/behind remote), and recent commits on this branch. Useful for understanding the current working context.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
      commitCount: {
        type: 'number',
        description: 'Number of recent commits to include (default: 5)',
      },
    },
  },
};

export async function handleBranchInfo(args: Record<string, unknown>) {
  const rawRepoPath = (args?.path as string) || '.';

  // Security: Validate repoPath
  const repoValidation = validateRepoPath(rawRepoPath);
  if (!repoValidation.valid) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ error: `Invalid repository path: ${repoValidation.error}` }),
      }],
    };
  }
  const repoPath = repoValidation.resolvedPath;

  const commitCount = (args?.commitCount as number) || 5;

  const gitOps = new GitOperations(repoPath);
  const status = await gitOps.getStatus();
  const recentCommits = await gitOps.getRecentCommits(commitCount);

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        branch: status.branch,
        sync: {
          ahead: status.ahead,
          behind: status.behind,
          status: status.ahead === 0 && status.behind === 0
            ? 'up-to-date'
            : status.behind > 0
              ? 'behind-remote'
              : 'ahead-of-remote',
        },
        workingTree: {
          staged: status.staged.length,
          unstaged: status.unstaged.length,
          untracked: status.untracked.length,
          isClean: status.isClean,
          stagedFiles: status.staged,
          unstagedFiles: status.unstaged,
        },
        recentCommits: recentCommits.map(c => ({
          hash: c.hash.substring(0, 8),
          message: c.message,
          author: c.author,
          date: c.date.toISOString(),
        })),
      }, null, 2),
    }],
  };
}
