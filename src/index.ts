#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import meow from 'meow';
import { App } from './components/App.js';
import { loadConfig } from './utils/config.js';

const cli = meow(`
  Usage
    $ gitpulse [command] [options]

  Commands
    (none)     Open interactive welcome menu
    commit     Generate smart commit message with AI
    status     Show repository status
    doc        Generate code documentation with AI
    analyze    Analyze documentation coverage
    explain    Explain code history for files
    pr         Generate PR description
    config     Manage configuration
    undo       Undo last commit
    redo       Redo last undone commit
    init       Initialize GitPulse in repository
    branch     Branch management (create, switch, delete, list, rename, suggest)
    resolve    Resolve merge conflicts with AI
    review     Code review with AI suggestions
    test       Run tests and analyze coverage
    issues     Issue tracker integration (GitHub/Linear/Jira)
    mcp        Start MCP server for AI agent integration
    dashboard  Open web dashboard for analytics (Pro/Team)

  Options
    --dry-run, -d    Show what would be done without executing
    --edit, -e       Edit commit message before committing
    --strict         Require quality gates to pass before commit
    --lax            Skip quality gate warnings
    --coverage       Show test coverage (for test command)
    --force          Force operation (for init/branch commands)
    --help           Show help

  Examples
    $ gitpulse              # Open welcome menu
    $ gitpulse commit
    $ gitpulse status
    $ gitpulse doc src/components/App.tsx
    $ gitpulse analyze
    $ gitpulse analyze src/utils/
    $ gitpulse explain src/auth.ts
    $ gitpulse pr --dry-run
    $ gitpulse init
    $ gitpulse branch list
    $ gitpulse branch create feature-branch
    $ gitpulse resolve ai
    $ gitpulse review staged
    $ gitpulse test --coverage
    $ gitpulse dashboard          # Pro/Team: Open analytics dashboard
    $ gitpulse dashboard --port 3001
`, {
  importMeta: import.meta,
  flags: {
    dryRun: {
      type: 'boolean',
      shortFlag: 'd',
      default: false
    },
    edit: {
      type: 'boolean',
      shortFlag: 'e',
      default: false
    },
    strict: {
      type: 'boolean',
      default: false
    },
    lax: {
      type: 'boolean',
      default: false
    },
    coverage: {
      type: 'boolean',
      default: false
    },
    force: {
      type: 'boolean',
      default: false
    },
    base: {
      type: 'string',
      default: 'main'
    },
    to: {
      type: 'string',
    },
    port: {
      type: 'string',
    },
    help: {
      type: 'boolean',
      default: false
    }
  }
});

async function main() {
  const [command, ...args] = cli.input;
  
  if (cli.flags.help) {
    cli.showHelp();
    return;
  }

  const validCommands = [
    'commit', 'status', 'doc', 'analyze', 'explain', 'pr', 'config', 'undo', 'redo',
    'init', 'branch', 'resolve', 'review', 'test', 'issues', 'mcp', 'dashboard'
  ];
  
  // If no command or invalid command, show welcome screen
  if (!command || !validCommands.includes(command)) {
    // Load config to ensure it's initialized
    loadConfig();

    // Render the Ink app with welcome screen
    render(
      React.createElement(App, {
        command: '',  // Empty command triggers welcome screen
        args: [],
        flags: cli.flags
      }),
      {
        stdout: process.stdout,
        stdin: process.stdin,
        exitOnCtrlC: false
      }
    );
    return;
  }

  // Load config to ensure it's initialized
  loadConfig();

  // Handle MCP command specially (spawns server process)
  if (command === 'mcp') {
    const { mcpCommand } = await import('./commands/mcp.js');
    const result = await mcpCommand.handler({ 
      args, 
      flags: cli.flags as Record<string, string | number | boolean | undefined> 
    });
    
    if (result.success) {
      console.log(result.message);
    } else {
      console.error(result.error);
      process.exit(1);
    }
    return;
  }

  // Handle dashboard command specially (opens browser)
  if (command === 'dashboard') {
    let port: number | undefined;
    if (cli.flags.port) {
      const parsedPort = parseInt(cli.flags.port as string, 10);
      // Security: Validate port range to prevent invalid binding
      if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        console.error('❌ Invalid port number. Port must be between 1 and 65535.');
        process.exit(1);
      }
      // Security: Avoid well-known system ports (1-1023) that require elevated privileges
      if (parsedPort < 1024) {
        console.error('❌ Port numbers below 1024 require elevated privileges. Please use a port >= 1024.');
        process.exit(1);
      }
      port = parsedPort;
    }
    const { dashboardCommand } = await import('./commands/dashboard.js');
    await dashboardCommand({ port, open: true });
    return;
  }

  // Render the Ink app
  render(
    React.createElement(App, {
      command,
      args,
      flags: cli.flags
    }),
    {
      stdout: process.stdout,
      stdin: process.stdin,
      exitOnCtrlC: false
    }
  );
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
