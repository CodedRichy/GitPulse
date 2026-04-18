import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConventionLearner } from '../../core/convention-learner.js';
import { validateRepoPath } from '../../core/path-security.js';

export const getConventionsTool: Tool = {
  name: 'get_conventions',
  description: 'Get the team\'s learned coding conventions including naming patterns (camelCase, PascalCase, etc.), commit message patterns, architectural module boundaries, and file relationships. Use this to align your code generation with team standards.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific files to get targeted convention context for',
      },
      refresh: {
        type: 'boolean',
        description: 'Force re-analyze conventions from git history (slower but fresh)',
      },
    },
  },
};

export async function handleGetConventions(args: Record<string, unknown>) {
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

  const files = args?.files as string[] | undefined;
  const refresh = (args?.refresh as boolean) ?? false;

  const learner = new ConventionLearner(repoPath);

  // Load or refresh conventions
  let conventions;
  if (refresh) {
    conventions = await learner.analyzeRepository();
  } else {
    conventions = await learner.loadOrAnalyzeConventions();
  }

  if (!conventions) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: 'No conventions found. Run with refresh: true to analyze from git history.',
          conventions: null,
        }),
      }],
    };
  }

  // If specific files requested, add targeted context
  let fileContext: Record<string, unknown>[] | undefined;
  if (files && files.length > 0) {
    fileContext = files.map(file => {
      const context = learner.getConventionsForContext(file);
      return {
        file,
        relevantConventions: context.relevantConventions,
        suggestedScopes: context.suggestedScopes,
        architecturalGuidance: context.architecturalGuidance,
        relatedFiles: context.relatedFiles,
      };
    });
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        conventions: {
          naming: conventions.naming,
          commitPatterns: conventions.commitPatterns.slice(0, 10),
          architecture: {
            moduleBoundaries: conventions.architecture.moduleBoundaries,
            preferredAbstractions: conventions.architecture.preferredAbstractions,
          },
          codeStyles: conventions.codeStyles,
          lastUpdated: conventions.lastUpdated,
        },
        ...(fileContext ? { fileContext } : {}),
      }, null, 2),
    }],
  };
}
