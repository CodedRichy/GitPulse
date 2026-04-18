import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { loadProjectConfig } from '../../core/gitpulse-config.js';
import { validateRepoPath } from '../../core/path-security.js';

export const getConfigTool: Tool = {
  name: 'get_config',
  description: 'Read the GitPulse configuration for this repository. Returns quality gate settings, convention rules, hook configuration, and allowed commit types. Useful for understanding what rules and standards are enforced.',
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

export async function handleGetConfig(args: Record<string, unknown>) {
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

  const config = loadProjectConfig(repoPath);

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        config,
        summary: {
          commitStyle: config.conventions.commit_style,
          allowedTypes: config.conventions.allowed_types,
          scopeRequired: config.conventions.enforce_scope,
          autoLearn: config.conventions.auto_learn,
          enabledGates: Object.entries(config.quality_gates)
            .filter(([, v]) => v.enabled)
            .map(([k, v]) => ({ name: k, severity: v.severity })),
          hooks: config.hooks,
        },
      }, null, 2),
    }],
  };
}
