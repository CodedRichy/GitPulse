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

  Options
    --dry-run, -d    Show what would be done without executing
    --edit, -e       Edit commit message before committing
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

  const validCommands = ['commit', 'status', 'doc', 'analyze', 'explain', 'pr', 'config', 'undo', 'redo'];
  
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
      })
    );
    return;
  }

  // Load config to ensure it's initialized
  loadConfig();

  // Render the Ink app
  render(
    React.createElement(App, {
      command,
      args,
      flags: cli.flags
    })
  );
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
