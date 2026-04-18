import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { loadProjectConfig, validateCommitMessage } from '../../core/gitpulse-config.js';
import { validateRepoPath } from '../../core/path-security.js';

export const validateCommitTool: Tool = {
  name: 'validate_commit_message',
  description: 'Validate a commit message against the repository\'s configured conventions (conventional commits, allowed types, scope enforcement, line length). Use this to check a message before committing.',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The commit message to validate',
      },
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
    },
    required: ['message'],
  },
};

export async function handleValidateCommit(args: Record<string, unknown>) {
  const message = args?.message as string;
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

  if (!message) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ valid: false, errors: ['No commit message provided'] }),
      }],
    };
  }

  const config = loadProjectConfig(repoPath);
  const result = validateCommitMessage(message, config);

  // Add helpful suggestions
  const suggestions: string[] = [];
  if (!result.valid && config.conventions.commit_style === 'conventional') {
    suggestions.push(`Format: type(scope): description`);
    suggestions.push(`Allowed types: ${config.conventions.allowed_types.join(', ')}`);
    if (config.conventions.enforce_scope) {
      suggestions.push('Scope is required in this repository');
    }
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        valid: result.valid,
        errors: result.errors,
        suggestions,
        style: config.conventions.commit_style,
        allowedTypes: config.conventions.allowed_types,
      }, null, 2),
    }],
  };
}
