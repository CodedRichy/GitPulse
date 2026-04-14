import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function mcpHandler(context: CommandContext): Promise<CommandResult> {
  const action = context.args[0] || 'start';

  switch (action) {
    case 'start':
      return startMCPServer();
    
    case 'config':
      return showMCPConfig();
    
    default:
      return {
        success: false,
        error: `Unknown MCP action: ${action}. Valid actions: start, config`,
      };
  }
}

function startMCPServer(): Promise<CommandResult> {
  return new Promise((resolve) => {
    // Start the MCP server
    const mcpPath = join(__dirname, '..', 'mcp', 'index.js');
    const child = spawn('node', [mcpPath], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to start MCP server: ${error.message}`,
      });
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: 'MCP server stopped successfully',
        });
      } else {
        resolve({
          success: false,
          error: `MCP server exited with code ${code}`,
        });
      }
    });
  });
}

function showMCPConfig(): CommandResult {
  const config = {
    name: 'gitpulse',
    version: '3.1.0',
    description: 'GitPulse MCP Server - AI-powered Git workflow assistant',
    transport: 'stdio',
    tools: [
      {
        name: 'analyze_repo',
        description: 'Analyze repository status, health, and metrics',
      },
      {
        name: 'suggest_commit',
        description: 'Generate AI-powered commit message for staged changes',
      },
      {
        name: 'review_changes',
        description: 'Perform quality review on staged changes',
      },
    ],
    resources: [
      {
        uri: 'repo://status',
        description: 'Current repository status',
      },
      {
        uri: 'repo://config',
        description: 'Repository configuration',
      },
    ],
    claudeDesktop: {
      command: 'npx',
      args: ['-y', 'gitpulse', 'mcp', 'start'],
    },
  };

  return {
    success: true,
    message: `GitPulse MCP Configuration:

${JSON.stringify(config, null, 2)}

To use with Claude Desktop:
1. Install Claude Desktop
2. Add to claude_desktop_config.json:

{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": ["-y", "gitpulse", "mcp", "start"]
    }
  }
}

To test the MCP server:
npx @anthropic-ai/mcp-inspector

Available tools:
- analyze_repo: Get repository health and metrics
- suggest_commit: Generate contextual commit messages
- review_changes: Quality review of staged changes`,
    data: config,
  };
}

export const mcpCommand: CommandRegistration = {
  name: 'mcp',
  description: 'Start or configure the GitPulse MCP server for AI agent integration',
  handler: mcpHandler,
  aliases: ['mcp-server'],
};
