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
import { loadProjectConfig } from '../core/gitpulse-config.js';
import { MCPSecurity, SecurityContext } from './security.js';

// Import tool definitions and handlers
import { analyzeRepoTool, handleAnalyzeRepo } from './tools/analyze-repo.js';
import { suggestCommitTool, handleSuggestCommit } from './tools/suggest-commit.js';
import { reviewChangesTool, handleReviewChanges } from './tools/review-changes.js';
import { runQualityGatesTool, handleRunQualityGates } from './tools/quality-gates.js';
import { validateCommitTool, handleValidateCommit } from './tools/validate-commit.js';
import { getConventionsTool, handleGetConventions } from './tools/get-conventions.js';
import { searchHistoryTool, handleSearchHistory } from './tools/search-history.js';
import { branchInfoTool, handleBranchInfo } from './tools/branch-info.js';
import { getConfigTool, handleGetConfig } from './tools/get-config.js';
import { analyzeFileTool, handleAnalyzeFile } from './tools/analyze-file.js';

/**
 * Tool registry entry — maps a tool definition to its handler.
 */
interface ToolEntry {
  definition: Tool;
  handler: (args: Record<string, unknown>) => Promise<{
    content: { type: string; text: string }[];
    isError?: boolean;
  }>;
}

/**
 * All registered MCP tools.
 * Add new tools here — they'll be auto-registered in the server.
 */
const TOOL_REGISTRY: ToolEntry[] = [
  // ─── Core (existing) ─────────────────────
  { definition: analyzeRepoTool, handler: handleAnalyzeRepo },
  { definition: suggestCommitTool, handler: handleSuggestCommit },
  { definition: reviewChangesTool, handler: handleReviewChanges },

  // ─── Quality & Conventions (new) ─────────
  { definition: runQualityGatesTool, handler: handleRunQualityGates },
  { definition: validateCommitTool, handler: handleValidateCommit },
  { definition: getConventionsTool, handler: handleGetConventions },

  // ─── Git Intelligence (new) ──────────────
  { definition: searchHistoryTool, handler: handleSearchHistory },
  { definition: branchInfoTool, handler: handleBranchInfo },
  { definition: getConfigTool, handler: handleGetConfig },
  { definition: analyzeFileTool, handler: handleAnalyzeFile },
];

export class GitPulseMCPServer {
  private server: Server;
  private gitOps: GitOperations;
  private toolMap: Map<string, ToolEntry>;
  private security: MCPSecurity;

  constructor() {
    this.gitOps = new GitOperations();
    this.toolMap = new Map();
    
    // Security: Initialize authentication and rate limiting
    // Auth is disabled by default for local development
    // Set MCP_REQUIRE_AUTH=true to enable token authentication
    this.security = new MCPSecurity({
      enabled: true,
      requireAuth: process.env.MCP_REQUIRE_AUTH === 'true',
      rateLimitWindowMs: 60000, // 1 minute
      rateLimitMaxRequests: 30, // 30 requests per minute per tool
    });

    // Build lookup map
    for (const entry of TOOL_REGISTRY) {
      this.toolMap.set(entry.definition.name, entry);
    }

    this.server = new Server(
      {
        name: 'gitpulse',
        version: '0.1.0',
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
    // List all tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_REGISTRY.map(entry => entry.definition),
    }));

    // Execute a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Security: Validate authentication and rate limits
      const authToken = (args as Record<string, unknown>)?._authToken as string | undefined;
      const securityContext = this.security.validateRequest(name, authToken);
      
      if (!securityContext.authenticated) {
        return {
          content: [{ 
            type: 'text', 
            text: `Security Error: ${securityContext.error}. Set MCP_REQUIRE_AUTH=false for local development or provide valid _authToken.` 
          }],
          isError: true,
        };
      }
      
      if (securityContext.rateLimitHit) {
        return {
          content: [{ 
            type: 'text', 
            text: `Rate Limit Error: ${securityContext.error}` 
          }],
          isError: true,
        };
      }
      
      const entry = this.toolMap.get(name);

      if (!entry) {
        return {
          content: [{ type: 'text', text: `Error: Unknown tool "${name}"` }],
          isError: true,
        };
      }

      try {
        // Remove auth token from args before passing to handler
        const cleanArgs = { ...(args as Record<string, unknown> || {}) };
        delete cleanArgs._authToken;
        
        return await entry.handler(cleanArgs);
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        { uri: 'repo://status', name: 'Repository Status', mimeType: 'application/json' },
        { uri: 'repo://config', name: 'GitPulse Configuration', mimeType: 'application/json' },
      ],
    }));

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'repo://status') {
        const status = await this.gitOps.getStatus();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(status, null, 2) }],
        };
      }

      if (uri === 'repo://config') {
        const config = loadProjectConfig();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(config, null, 2) }],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  /** Get list of registered tool names (useful for testing). */
  getRegisteredTools(): string[] {
    return [...this.toolMap.keys()];
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitPulse MCP Server running on stdio');
    console.error(`Registered tools: ${this.getRegisteredTools().join(', ')}`);
    
    // Security: Log security status
    const securityStatus = this.security.getStatus();
    console.error(`Security: ${securityStatus.enabled ? 'enabled' : 'disabled'}`);
    console.error(`Authentication: ${securityStatus.requireAuth ? 'required' : 'optional'}`);
    if (securityStatus.requireAuth) {
      console.error('Auth token stored in: ~/.gitpulse/.mcp-token');
    }
  }
}

export default GitPulseMCPServer;
