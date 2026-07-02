import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { 
  Layout, 
  Separator, 
  StatusLine, 
  ToolList, 
  CommandPrompt,
  Footer 
} from './ui/ProfessionalLayout.js';
import { GitOperations } from '../core/git.js';
import { resolveModel } from '../utils/config.js';
import { getSetting } from '../utils/settings.js';
import { getGlobalHealthManager } from '../ai/provider-health.js';

const GITPULSE_ASCII = `
   ____ _ _    ____  _   _ _   _ ____
  / ___| | |  |  _ \\| | | | | | |  _ \\
 | |  _| | |  | |_) | | | | | | | |_) |
 | |_| | | |  |  __/| |_| | |_| |  _ <
  \\____|_|_|  |_|    \\____/\\___/|_| \\_\\

           AI-Powered Git Guardrails v0.1.0
`;

const QUICK_TOOLS = [
  { icon: '💾', name: 'commit', shortcut: 'c', desc: 'Smart commit with AI quality gates' },
  { icon: '📊', name: 'status', shortcut: 's', desc: 'Repository status and health score' },
  { icon: '📝', name: 'pr', shortcut: 'p', desc: 'Generate PR from commit history' },
  { icon: '🌿', name: 'branch', shortcut: 'b', desc: 'AI-powered branch management' },
  { icon: '🔍', name: 'review', desc: 'AI code review with quality analysis' },
  { icon: '📄', name: 'doc', desc: 'Generate documentation for files' },
  { icon: '🔎', name: 'analyze', desc: 'Check documentation coverage' },
  { icon: '↩️', name: 'undo', desc: 'Safely undo last commit' },
  { icon: '↪️', name: 'redo', desc: 'Redo previously undone commit' },
  { icon: '📋', name: 'audit', desc: 'View quality gate history' },
  { icon: '📈', name: 'report', desc: 'Generate compliance reports' },
  { icon: '⚙️', name: 'config', desc: 'Configure settings and providers' },
];

export function WelcomePro() {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [currentModel] = useState(resolveModel(getSetting('model', 'auto')));
  const [repoInfo, setRepoInfo] = useState<{ name: string; branch: string } | null>(null);
  const [providerHealth, setProviderHealth] = useState('⚡');

  useEffect(() => {
    loadRepoInfo();
    loadProviderHealth();
  }, []);

  async function loadRepoInfo() {
    try {
      const git = new GitOperations();
      if (await git.isRepo()) {
        const status = await git.getStatus();
        const cwd = process.cwd();
        setRepoInfo({
          name: cwd.split(/[\\/]/).pop() || cwd,
          branch: status.branch
        });
      }
    } catch {}
  }

  function loadProviderHealth() {
    const manager = getGlobalHealthManager();
    const providers = manager.getAllHealth();
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
      if (cmd === 'quit' || cmd === 'q' || cmd === 'exit') {
        exit();
      }
    } else if (value === '?') {
      setShowHelp(!showHelp);
    } else if (key.escape) {
      exit();
    }
  });

  const statusItems = [
    { label: 'Model', value: `${providerHealth} ${currentModel.split('/').pop() || currentModel}`, color: 'cyan' },
    ...(repoInfo ? [
      { label: 'Repo', value: repoInfo.name, color: 'green' },
      { label: 'Branch', value: repoInfo.branch, color: 'yellow' }
    ] : []),
  ];

  return (
    <Layout width={80} showBorder={true}>
      {/* ASCII Header */}
      <Box marginBottom={1}>
        <Text color="cyan">{GITPULSE_ASCII}</Text>
      </Box>

      {/* Status Line */}
      <StatusLine items={statusItems} />
      
      <Separator />

      {/* Main Content */}
      <Box marginY={1}>
        {showHelp ? (
          <Box flexDirection="column">
            <Text bold color="cyan">Available Commands</Text>
            <Box marginTop={1}>
              <ToolList tools={QUICK_TOOLS} />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Type any command name and press Enter</Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text bold color="cyan">Quick Commands</Text>
            <Box marginTop={1}>
              <ToolList tools={QUICK_TOOLS.slice(0, 8)} />
            </Box>
          </Box>
        )}
      </Box>

      <Separator />

      {/* Command Input */}
      <Box marginY={1}>
        <Box flexDirection="row">
          <Text bold color="white">❯ </Text>
          <TextInput
            value={input}
            onChange={setInput}
            placeholder="Type command or ? for help"
            showCursor={true}
            focus={true}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Footer 
        left={showHelp ? "Press ? to hide help" : "Press ? for all commands"}
        right="Ctrl+C to quit"
      />
    </Layout>
  );
}

export default WelcomePro;
