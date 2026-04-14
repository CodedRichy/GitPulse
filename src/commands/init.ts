import * as fs from 'fs';
import * as path from 'path';
import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { GitOperations } from '../core/git.js';
import { AIProviderFactory } from '../ai/providers.js';

interface InitOptions {
  force?: boolean;
  global?: boolean;
  hooks?: boolean;
}

async function detectAIProvider(): Promise<{ provider: string; model: string; available: boolean }> {
  // Check Ollama first (local, free)
  try {
    const ollamaProvider = AIProviderFactory.create('ollama', {
      ollamaHost: 'http://localhost:11434',
      model: 'llama3.2'
    });
    const available = await ollamaProvider.isAvailable();
    if (available) {
      return { provider: 'ollama', model: 'llama3.2', available: true };
    }
  } catch {
    // Ollama not available
  }

  // Check for API keys in environment
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: 'openrouter', model: 'auto', available: true };
  }
  if (process.env.GOOGLE_API_KEY) {
    return { provider: 'google', model: 'gemini-3.1-flash-lite-preview', available: true };
  }
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', model: 'llama-3.3-70b-versatile', available: true };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', model: 'gpt-4', available: true };
  }

  // Default to Ollama with warning
  return { provider: 'ollama', model: 'llama3.2', available: false };
}

async function installPreCommitHook(repoRoot: string): Promise<void> {
  const hooksDir = path.join(repoRoot, '.git', 'hooks');
  const preCommitHookPath = path.join(hooksDir, 'pre-commit');

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const hookScript = `#!/bin/sh
# GitPulse pre-commit hook
# Run gitpulse commit --dry-run to validate commit message before committing

gitpulse commit --dry-run
`;

  // Check if hook already exists
  if (fs.existsSync(preCommitHookPath)) {
    const existingHook = fs.readFileSync(preCommitHookPath, 'utf-8');
    if (!existingHook.includes('GitPulse')) {
      // Append GitPulse hook
      fs.appendFileSync(preCommitHookPath, `\n${hookScript}`);
    }
  } else {
    fs.writeFileSync(preCommitHookPath, hookScript);
  }

  // Make hook executable on Unix systems
  try {
    fs.chmodSync(preCommitHookPath, 0o755);
  } catch {
    // Windows doesn't support chmod
  }
}

async function initHandler(context: CommandContext): Promise<CommandResult> {
  const gitOps = new GitOperations();
  const isRepo = await gitOps.isRepo();

  if (!isRepo) {
    return {
      success: false,
      error: 'Not a git repository. Run "git init" first.',
    };
  }

  const options: InitOptions = {
    force: context.flags.force === true,
    global: context.flags.global === true,
    hooks: context.flags.hooks !== false, // Default to true
  };

  try {
    const repoRoot = await gitOps.getRepoRoot();
    const gitpulseDir = path.join(repoRoot, '.gitpulse');
    const configPath = path.join(gitpulseDir, 'config.json');

    if (fs.existsSync(gitpulseDir) && !options.force) {
      return {
        success: false,
        error: 'GitPulse is already initialized. Use --force to reinitialize.',
      };
    }

    if (!fs.existsSync(gitpulseDir)) {
      fs.mkdirSync(gitpulseDir, { recursive: true });
    }

    // Auto-detect AI provider
    const detected = await detectAIProvider();

    const defaultConfig = {
      version: '3.0.0',
      initialized: new Date().toISOString(),
      aiProvider: detected.provider,
      settings: {
        autoStage: false,
        confirmCommits: true,
        aiEnabled: true,
        commitStyle: 'conventional',
        hooksEnabled: options.hooks,
      },
      model: detected.model,
      detectedProvider: detected.available,
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));

    // Add .gitpulse to .gitignore
    const gitignorePath = path.join(repoRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.gitpulse')) {
        fs.appendFileSync(gitignorePath, '\n.gitpulse/\n');
      }
    } else {
      fs.writeFileSync(gitignorePath, '.gitpulse/\n');
    }

    // Install pre-commit hooks if enabled
    if (options.hooks) {
      await installPreCommitHook(repoRoot);
    }

    let message = 'GitPulse initialized successfully in this repository.\n';
    message += `  AI Provider: ${detected.provider}${detected.available ? ' (auto-detected)' : ' (not available)'}`;
    if (detected.available) {
      message += `\n  Model: ${detected.model}`;
    }
    if (!detected.available) {
      message += '\n  ⚠️  No AI provider detected. Configure with: gitpulse config';
    }
    if (options.hooks) {
      message += '\n  Pre-commit hooks: enabled';
    }

    return {
      success: true,
      message,
      data: { configPath, provider: detected.provider, model: detected.model },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize GitPulse',
    };
  }
}

export const initCommand: CommandRegistration = {
  name: 'init',
  description: 'Initialize GitPulse in the current repository with auto-configuration',
  handler: initHandler,
  aliases: ['initialize'],
};
