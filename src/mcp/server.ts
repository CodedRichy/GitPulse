import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GitOperations } from '../core/git.js';
import { getAIProvider } from '../ai/providers.js';
import { reviewStagedChanges, formatReviewResult } from '../core/code-review.js';

// Tool definitions
const ANALYZE_REPO_TOOL: Tool = {
  name: 'analyze_repo',
  description: 'Analyze repository status, health, and metrics',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current)',
      },
    },
  },
};

const SUGGEST_COMMIT_TOOL: Tool = {
  name: 'suggest_commit',
  description: 'Generate AI-powered commit message for staged changes',
  inputSchema: {
    type: 'object',
    properties: {
      context: {
        type: 'string',
        description: 'Additional context about the changes',
      },
    },
  },
};

const REVIEW_CHANGES_TOOL: Tool = {
  name: 'review_changes',
  description: 'Perform quality review on staged or unstaged changes',
  inputSchema: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        enum: ['staged', 'unstaged', 'last-commit'],
        description: 'Which changes to review',
      },
    },
    required: ['target'],
  },
};

export class GitPulseMCPServer {
  private server: Server;
  private gitOps: GitOperations;

  constructor() {
    this.gitOps = new GitOperations();
    this.server = new Server(
      {
        name: 'gitpulse',
        version: '3.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.registerHandlers();
  }

  private registerHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [ANALYZE_REPO_TOOL, SUGGEST_COMMIT_TOOL, REVIEW_CHANGES_TOOL],
      };
    });

    // Execute tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_repo':
            return await this.handleAnalyzeRepo(args);
          case 'suggest_commit':
            return await this.handleSuggestCommit(args);
          case 'review_changes':
            return await this.handleReviewChanges(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'repo://status',
            name: 'Repository Status',
            mimeType: 'application/json',
          },
          {
            uri: 'repo://config',
            name: 'Repository Configuration',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        if (uri === 'repo://status') {
          const status = await this.gitOps.getStatus();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(status, null, 2),
              },
            ],
          };
        }

        throw new Error(`Unknown resource: ${uri}`);
      } catch (error) {
        throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private async handleAnalyzeRepo(args: any) {
    const status = await this.gitOps.getStatus();
    const isRepo = await this.gitOps.isRepo();

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
      health: this.calculateHealthScore(status),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async handleSuggestCommit(args: any) {
    const status = await this.gitOps.getStatus();

    if (status.staged.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'No staged changes found',
              suggestion: null,
              confidence: 0,
            }),
          },
        ],
      };
    }

    const diff = await this.gitOps.getStagedDiff();
    const ai = getAIProvider();

    if (!ai) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'No AI provider configured',
              suggestion: null,
              confidence: 0,
            }),
          },
        ],
      };
    }

    const prompt = `
Generate a commit message for these changes:

${diff}

${args?.context ? `Additional context: ${args.context}` : ''}

Requirements:
- Use conventional commits format (type: description)
- Be specific about what changed
- Keep it under 72 characters for the first line
- Add body if needed for complex changes

Respond with ONLY the commit message, nothing else.`;

    const suggestion = await ai.generate(prompt);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            suggestion: suggestion.trim(),
            confidence: 0.85,
            filesChanged: status.staged,
          }, null, 2),
        },
      ],
    };
  }

  private async handleReviewChanges(args: any) {
    const target = args?.target || 'staged';

    if (target === 'staged') {
      const result = await reviewStagedChanges();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              filesReviewed: result.filesReviewed,
              summary: result.summary,
              issues: result.issues,
              formatted: formatReviewResult(result),
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Review target '${target}' not yet implemented`,
          }),
        },
      ],
    };
  }

  private calculateHealthScore(status: any): number {
    let score = 100;
    
    // Deduct for uncommitted changes
    if (status.unstaged.length > 0) score -= 10;
    if (status.untracked.length > 0) score -= 5;
    
    // Deduct for being behind remote
    if (status.behind > 0) score -= 15;
    
    // Deduct for being too far ahead (risk of merge conflicts)
    if (status.ahead > 10) score -= 10;
    
    return Math.max(0, score);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitPulse MCP Server running on stdio');
  }
}

export default GitPulseMCPServer;
