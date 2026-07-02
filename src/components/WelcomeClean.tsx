import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { Header } from './ui/Header.js';
import { ToolGrid } from './ui/ToolGrid.js';
import { GitOperations } from '../core/git.js';
import { resolveModel } from '../utils/config.js';
import { getSetting } from '../utils/settings.js';
import { getGlobalHealthManager } from '../ai/provider-health.js';

interface WelcomeProps {
  onCommandSelect?: (command: string) => void;
}

const QUICK_TOOLS = [
  { icon: '💾', name: 'commit', shortcut: 'c', description: 'Smart commit with AI' },
  { icon: '📊', name: 'status', shortcut: 's', description: 'View repository status' },
  { icon: '📝', name: 'pr', shortcut: 'p', description: 'Generate PR description' },
  { icon: '🌿', name: 'branch', shortcut: 'b', description: 'Branch management' },
  { icon: '🔍', name: 'review', description: 'AI code review' },
  { icon: '📄', name: 'doc', description: 'Generate documentation' },
  { icon: '↩️', name: 'undo', description: 'Undo last commit' },
  { icon: '↪️', name: 'redo', description: 'Redo undone commit' },
];

export function WelcomeClean({ onCommandSelect }: WelcomeProps) {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [currentModel, setCurrentModel] = useState(resolveModel(getSetting('model', 'auto')));
  const [repoInfo, setRepoInfo] = useState<{ name: string; branch: string } | null>(null);
  const [providerHealth, setProviderHealth] = useState<string>('⚡');

  useEffect(() => {
    loadRepoInfo();
    loadProviderHealth();
  }, []);

  async function loadRepoInfo() {
    try {
      const git = new GitOperations();
      const isRepo = await git.isRepo();
      if (isRepo) {
        const status = await git.getStatus();
        const cwd = process.cwd();
        setRepoInfo({
          name: cwd.split(/[\\/]/).pop() || cwd,
          branch: status.branch
        });
      }
    } catch {
      // Not a git repo
    }
  }

  function loadProviderHealth() {
    const healthManager = getGlobalHealthManager();
    const providers = healthManager.getAllHealth();
    const active = providers.find(p => p.available);
    if (active) {
      if (active.circuitOpen) setProviderHealth('🔴');
      else if (active.averageLatencyMs > 5000) setProviderHealth('🐌');
      else if (active.averageLatencyMs < 1000) setProviderHealth('⚡');
      else setProviderHealth('🟢');
    }
  }

  useInput((value, key) => {
    if (key.return && input.trim()) {
      const cmd = input.trim().toLowerCase();
      if (cmd === 'quit' || cmd === 'q') {
        exit();
      } else if (onCommandSelect) {
        onCommandSelect(cmd);
      }
    } else if (value === '?') {
      setShowHelp(!showHelp);
    } else if (key.escape) {
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      {/* Clean ASCII Header */}
      <Header mini />
      
      {/* Status Line - Hermes Style */}
      <Box flexDirection="row" gap={3} marginY={1}>
        <Text>
          <Text dimColor>Model:</Text>{' '}
          <Text color="cyan">{providerHealth}</Text>{' '}
          <Text>{currentModel.split('/').pop() || currentModel}</Text>
        </Text>
        {repoInfo && (
          <Text>
            <Text dimColor>Repo:</Text>{' '}
            <Text color="green">{repoInfo.name}</Text>
            <Text color="gray"> ({repoInfo.branch})</Text>
          </Text>
        )}
      </Box>

      {/* Separator */}
      <Text dimColor>{'─'.repeat(80)}</Text>

      {/* Quick Tools - Clean Grid */}
      {!showHelp && (
        <Box marginY={1}>
          <ToolGrid tools={QUICK_TOOLS} columns={2} />
        </Box>
      )}

      {/* Help Box - Only When Requested */}
      {showHelp && (
        <Box 
          borderStyle="round" 
          borderColor="gray"
          paddingX={2}
          paddingY={1}
          marginY={1}
        >
          <Text bold color="cyan">All Commands</Text>
          <Box marginTop={1}>
            <Text dimColor>
              commit, status, pr, branch, review, doc, analyze, explain, undo, redo, audit, report, init, config, model, quit
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Type /help for detailed documentation</Text>
          </Box>
        </Box>
      )}

      {/* Separator */}
      <Text dimColor>{'─'.repeat(80)}</Text>

      {/* Input Prompt */}
      <Box flexDirection="row" marginTop={1}>
        <Text bold color="white">❯ </Text>
        <TextInput
          value={input}
          onChange={setInput}
          placeholder="Type command or ? for help"
          showCursor={true}
          focus={true}
        />
      </Box>

      {/* Footer Hint */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Text dimColor>{showHelp ? 'Press ? to hide help' : 'Press ? for all commands'}</Text>
        <Text dimColor>Ctrl+C to quit</Text>
      </Box>
    </Box>
  );
}

export default WelcomeClean;
