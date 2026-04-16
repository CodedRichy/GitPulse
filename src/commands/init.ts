import * as fs from 'fs';
import * as path from 'path';
import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { GitOperations } from '../core/git.js';
import { AIProviderFactory } from '../ai/providers.js';
import { initProjectConfig, saveProjectConfig, type GitPulseProjectConfig } from '../core/gitpulse-config.js';
import { detectProjectStack, suggestConfigForStack, formatStackSummary } from '../core/stack-detector.js';

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

/**
 * Install pre-commit hook that runs quality gates.
 * Exits non-zero if critical/high issues are found, blocking the commit.
 */
function installPreCommitHook(repoRoot: string): void {
  const hooksDir = path.join(repoRoot, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const hookScript = `#!/bin/sh
# GitPulse pre-commit hook — quality gates enforcement
# Installed by: gitpulse init
# To skip: git commit --no-verify

# Check if gitpulse/pulse is available
if command -v pulse >/dev/null 2>&1; then
  echo "\\033[36m[GitPulse]\\033[0m Running quality gates..."
  pulse commit --dry-run --strict 2>/dev/null
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "\\033[31m[GitPulse]\\033[0m Quality gates failed. Fix issues or use --no-verify to skip."
    exit 1
  fi
  echo "\\033[32m[GitPulse]\\033[0m Quality gates passed."
elif command -v npx >/dev/null 2>&1; then
  # Fallback: try via npx
  npx -y gitpulse commit --dry-run --strict 2>/dev/null || true
fi

exit 0
`;

  // Check if hook already exists and contains GitPulse
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf-8');
    if (existing.includes('GitPulse')) {
      // Already installed — overwrite with latest version
      fs.writeFileSync(hookPath, hookScript);
    } else {
      // Append to existing hook
      fs.appendFileSync(hookPath, `\n${hookScript}`);
    }
  } else {
    fs.writeFileSync(hookPath, hookScript);
  }

  try {
    fs.chmodSync(hookPath, 0o755);
  } catch {
    // Windows doesn't support chmod
  }
}

/**
 * Install commit-msg hook that validates commit message format
 * against the team's configured conventions.
 */
function installCommitMsgHook(repoRoot: string): void {
  const hooksDir = path.join(repoRoot, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'commit-msg');

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const hookScript = `#!/bin/sh
# GitPulse commit-msg hook — convention enforcement
# Installed by: gitpulse init
# To skip: git commit --no-verify

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Load config to check commit style
CONFIG_FILE=".gitpulse/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  exit 0
fi

# Read commit style from config
STYLE=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8'));console.log(c.conventions?.commit_style||'conventional')}catch{console.log('conventional')}" 2>/dev/null)

if [ "$STYLE" = "conventional" ]; then
  # Validate conventional commit format: type(scope): description
  FIRST_LINE=$(echo "$COMMIT_MSG" | head -1)
  if ! echo "$FIRST_LINE" | grep -qE '^(feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert)(\([a-zA-Z0-9_-]+\))?:\\ .+'; then
    echo "\\033[31m[GitPulse]\\033[0m Commit message does not follow conventional format."
    echo "  Expected: type(scope): description"
    echo "  Types: feat, fix, docs, style, refactor, test, chore, ci, perf, build, revert"
    echo "  Example: feat(auth): add GitHub OAuth login"
    echo ""
    echo "  To skip: git commit --no-verify"
    exit 1
  fi
fi

exit 0
`;

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf-8');
    if (existing.includes('GitPulse')) {
      fs.writeFileSync(hookPath, hookScript);
    } else {
      fs.appendFileSync(hookPath, `\n${hookScript}`);
    }
  } else {
    fs.writeFileSync(hookPath, hookScript);
  }

  try {
    fs.chmodSync(hookPath, 0o755);
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

    if (fs.existsSync(gitpulseDir) && !options.force) {
      return {
        success: false,
        error: 'GitPulse is already initialized. Use --force to reinitialize.',
      };
    }

    // Detect project stack
    const stack = detectProjectStack(repoRoot);
    const stackSummary = formatStackSummary(stack);

    // Get suggested config based on stack
    const suggestedConfig = suggestConfigForStack(stack);

    // Initialize project config with stack-aware settings
    let projectConfig = initProjectConfig(repoRoot);

    // Apply suggested custom gates if any
    if (suggestedConfig.customGates.length > 0) {
      projectConfig.custom_gates = suggestedConfig.customGates.map(g => ({
        name: g.name,
        description: g.description,
        pattern: g.pattern,
        severity: g.severity,
        include: g.include,
      }));
    }

    // Update enabled gates based on suggestions
    for (const gateName of Object.keys(projectConfig.quality_gates)) {
      projectConfig.quality_gates[gateName].enabled = suggestedConfig.enabledGates.includes(gateName);
    }

    // Save the enhanced config
    saveProjectConfig(projectConfig, repoRoot);

    // Auto-detect AI provider
    const detected = await detectAIProvider();

    // Save provider info alongside project config
    const providerInfoPath = path.join(gitpulseDir, 'provider.json');
    fs.writeFileSync(providerInfoPath, JSON.stringify({
      aiProvider: detected.provider,
      model: detected.model,
      detectedAt: new Date().toISOString(),
      available: detected.available,
    }, null, 2) + '\n');

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

    // Install hooks
    if (options.hooks) {
      if (projectConfig.hooks.pre_commit) {
        installPreCommitHook(repoRoot);
      }
      if (projectConfig.hooks.commit_msg) {
        installCommitMsgHook(repoRoot);
      }
    }

    // Build success message
    const lines: string[] = [
      'GitPulse initialized successfully.',
      '',
      `  📦 Stack:    ${stackSummary}`,
      `  ⚙️  Config:   .gitpulse/config.json`,
      `  🤖 Provider: ${detected.provider}${detected.available ? ' (auto-detected)' : ' (not available)'}`,
    ];

    if (detected.available) {
      lines.push(`  🧠 Model:    ${detected.model}`);
    } else {
      lines.push('  ⚠️  No AI provider detected. Configure with: gitpulse config');
    }

    if (suggestedConfig.customGates.length > 0) {
      lines.push(`  🎯 Custom:   ${suggestedConfig.customGates.length} stack-specific quality gates added`);
    }

    if (options.hooks) {
      const hooksList: string[] = [];
      if (projectConfig.hooks.pre_commit) hooksList.push('pre-commit (quality gates)');
      if (projectConfig.hooks.commit_msg) hooksList.push('commit-msg (convention check)');
      lines.push(`  🪝 Hooks:    ${hooksList.join(', ')}`);
    }

    lines.push('');
    lines.push('  📝 Edit .gitpulse/config.json to customize quality gates and conventions.');
    lines.push('  📊 Run `gitpulse dashboard` to view analytics (requires web dashboard).');

    return {
      success: true,
      message: lines.join('\n'),
      data: {
        configPath: path.join(gitpulseDir, 'config.json'),
        provider: detected.provider,
        model: detected.model,
      },
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

