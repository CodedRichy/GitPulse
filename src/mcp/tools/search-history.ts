import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GitOperations } from '../../core/git.js';
import { validateRepoPath } from '../../core/path-security.js';

export const searchHistoryTool: Tool = {
  name: 'search_commit_history',
  description: 'Search the git commit history by keyword, file path, or author. Returns matching commits with hashes, messages, authors, and dates. Useful for understanding past changes and finding related work.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
      query: {
        type: 'string',
        description: 'Search keyword to match in commit messages',
      },
      file: {
        type: 'string',
        description: 'Filter commits that touched this file path',
      },
      author: {
        type: 'string',
        description: 'Filter commits by author name',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 20, max: 100)',
      },
    },
  },
};

export async function handleSearchHistory(args: Record<string, unknown>) {
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

  const query = args?.query as string | undefined;
  const file = args?.file as string | undefined;
  const author = args?.author as string | undefined;
  const limit = Math.min((args?.limit as number) || 20, 100);

  const gitOps = new GitOperations(repoPath);

  // If a specific file is requested, use file history
  if (file) {
    const commits = await gitOps.getFileHistory(file, limit);
    const filtered = filterCommits(commits, { query, author });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          file,
          total: filtered.length,
          commits: filtered.map(c => ({
            hash: c.hash.substring(0, 8),
            message: c.message,
            author: c.author,
            date: c.date.toISOString(),
          })),
        }, null, 2),
      }],
    };
  }

  // General history search
  const allCommits = await gitOps.getRecentCommits(limit);
  const filtered = filterCommits(allCommits, { query, author });

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        total: filtered.length,
        commits: filtered.map(c => ({
          hash: c.hash.substring(0, 8),
          message: c.message,
          author: c.author,
          date: c.date.toISOString(),
        })),
      }, null, 2),
    }],
  };
}

function filterCommits(
  commits: { hash: string; message: string; author: string; date: Date }[],
  filters: { query?: string; author?: string }
) {
  let result = commits;

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(c => c.message.toLowerCase().includes(q));
  }

  if (filters.author) {
    const a = filters.author.toLowerCase();
    result = result.filter(c => c.author.toLowerCase().includes(a));
  }

  return result;
}
