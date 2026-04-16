import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { reviewStagedChanges, formatReviewResult } from '../../core/code-review.js';

export const reviewChangesTool: Tool = {
  name: 'review_changes',
  description: 'Perform quality review on staged changes. Returns issues found with severity, file locations, and suggestions for fixes.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
      target: {
        type: 'string',
        enum: ['staged', 'unstaged', 'last-commit'],
        description: 'Which changes to review (default: staged)',
      },
    },
  },
};

export async function handleReviewChanges(args: Record<string, unknown>) {
  const repoPath = (args?.path as string) || '.';
  const target = (args?.target as string) || 'staged';

  if (target === 'staged') {
    const result = await reviewStagedChanges(repoPath);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          filesReviewed: result.filesReviewed,
          summary: result.summary,
          issues: result.issues,
          formatted: formatReviewResult(result),
        }, null, 2),
      }],
    };
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ error: `Review target '${target}' not yet implemented` }),
    }],
  };
}
