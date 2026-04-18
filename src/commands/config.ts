import * as fs from 'fs';
import * as path from 'path';
import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { GitOperations } from '../core/git.js';
import { loadSyncConfig } from '../core/cloud-sync.js';

interface ConfigOptions {
  show?: boolean;
  setApiKey?: string;
}

function getConfigPath(repoRoot: string): string {
  return path.join(repoRoot, '.gitpulse', 'config.json');
}

function loadConfig(repoRoot: string): any {
  const configPath = getConfigPath(repoRoot);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

function saveConfig(repoRoot: string, config: any): void {
  const configPath = getConfigPath(repoRoot);
  const gitpulseDir = path.join(repoRoot, '.gitpulse');
  
  if (!fs.existsSync(gitpulseDir)) {
    fs.mkdirSync(gitpulseDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

async function configHandler(context: CommandContext): Promise<CommandResult> {
  const gitOps = new GitOperations();
  let repoRoot: string;
  
  try {
    repoRoot = await gitOps.getRepoRoot();
  } catch {
    return {
      success: false,
      error: 'Not in a Git repository. Run "git init" first, then "gitpulse init".',
    };
  }

  // Check if gitpulse is initialized
  const gitpulseDir = path.join(repoRoot, '.gitpulse');
  if (!fs.existsSync(gitpulseDir)) {
    return {
      success: false,
      error: 'GitPulse not initialized. Run "gitpulse init" first.',
    };
  }

  // Handle --set-api-key flag
  const setApiKeyFlag = context.flags['set-api-key'];
  if (typeof setApiKeyFlag === 'string' && setApiKeyFlag) {
    const apiKey = setApiKeyFlag.trim();
    
    // Validate API key format
    if (!apiKey.startsWith('gp_') || apiKey.length < 20) {
      return {
        success: false,
        error: 'Invalid API key format. Must start with "gp_" and be at least 20 characters.',
      };
    }

    // Load existing config or create new
    const config = loadConfig(repoRoot) || {};
    config.api_key = apiKey;
    config.cloud_sync = true;
    
    saveConfig(repoRoot, config);
    
    const keyType = apiKey.startsWith('gp_team_') ? 'team' : 'personal';
    
    return {
      success: true,
      message: [
        `✅ API key saved (${keyType} workspace).`,
        '',
        'Telemetry will now sync to your dashboard.',
        'Run "gitpulse teams" to see available team workspaces.',
      ].join('\n'),
    };
  }

  // Show current config
  const config = loadConfig(repoRoot);
  const syncConfig = loadSyncConfig(repoRoot);
  
  if (!config && !syncConfig) {
    return {
      success: true,
      message: [
        '📋 GitPulse Configuration',
        '',
        'No custom configuration set.',
        '',
        'To set an API key:',
        '  gitpulse config --set-api-key <your-api-key>',
        '',
        'Get your API key from: https://gitpulse.io/dashboard',
      ].join('\n'),
    };
  }

  const lines: string[] = [
    '📋 GitPulse Configuration',
    '',
  ];

  if (config?.api_key) {
    const maskedKey = config.api_key.substring(0, 8) + '...' + config.api_key.substring(-4);
    const keyType = config.api_key.startsWith('gp_team_') ? 'team' : 'personal';
    lines.push(`  API Key:    ${maskedKey} (${keyType})`);
    lines.push(`  Cloud Sync: ${config.cloud_sync !== false ? 'enabled' : 'disabled'}`);
  } else {
    lines.push('  API Key:    not set');
    lines.push('  Cloud Sync: disabled');
  }

  if (config?.aiProvider) {
    lines.push(`  AI Provider: ${config.aiProvider}`);
  }

  if (config?.tier) {
    lines.push(`  Tier:        ${config.tier}`);
  }

  lines.push('');
  lines.push('To change API key:');
  lines.push('  gitpulse config --set-api-key <new-api-key>');

  return {
    success: true,
    message: lines.join('\n'),
  };
}

export const configCommand: CommandRegistration = {
  name: 'config',
  description: 'Show or update GitPulse configuration',
  aliases: ['cfg'],
  handler: configHandler,
};
