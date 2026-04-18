import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GitOperations } from '../../core/git.js';
import { getAIProvider } from '../../ai/providers.js';
import { validateRepoPath } from '../../core/path-security.js';

export const suggestCommitTool: Tool = {
  name: 'suggest_commit',
  description: 'Generate an AI-powered commit message for staged changes. Returns a suggested message, confidence score, and list of changed files.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
      context: {
        type: 'string',
        description: 'Additional context about the changes (e.g., ticket number, feature description)',
      },
    },
  },
};

export async function handleSuggestCommit(args: Record<string, unknown>) {
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

  const gitOps = new GitOperations(repoPath);
  const status = await gitOps.getStatus();

  if (status.staged.length === 0) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ error: 'No staged changes found', suggestion: null, confidence: 0 }),
      }],
    };
  }

  const diff = await gitOps.getStagedDiff();
  const ai = getAIProvider();

  if (!ai) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ error: 'No AI provider configured', suggestion: null, confidence: 0 }),
      }],
    };
  }

  const context = args?.context as string | undefined;
  const prompt = `
Generate a commit message for these changes:

${diff.substring(0, 4000)}

${context ? `Additional context: ${context}` : ''}

Requirements:
- Use conventional commits format (type: description)
- Be specific about what changed
- Keep it under 72 characters for the first line
- Add body if needed for complex changes

Respond with ONLY the commit message, nothing else.`;

  const suggestion = await ai.generate(prompt);

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        suggestion: suggestion.trim(),
        confidence: 0.85,
        filesChanged: status.staged,
      }, null, 2),
    }],
  };
}
