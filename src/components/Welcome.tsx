import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState, useEffect } from 'react';
import {   Box, Text, useInput, useApp   } from "ink";
import TextInput from 'ink-text-input';
import { ChatMessage, StatusBar, SectionDivider } from './ui.js';
import { Box as HermesBox, Grid, Header, FeatureCard } from './ui/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { GitOperations } from '../core/git.js';
import { MODEL_ALIASES, resolveModel } from '../utils/config.js';
import { getSetting, setSetting } from '../utils/settings.js';
import { AIProviderFactory } from '../ai/providers.js';
import { ProviderHealth, getGlobalHealthManager } from '../ai/provider-health.js';

interface RecentActivity {
  type: 'commit' | 'doc' | 'pr' | 'analyze';
  description: string;
  timestamp: Date;
}

interface WelcomeProps {
  onCommandSelect?: (command: string) => void;
}

const COMMANDS = [
  { name: 'commit', desc: 'Generate AI commit message with quality gates', example: 'commit [--strict]' },
  { name: 'status', desc: 'View repository status and health score', example: 'status' },
  { name: 'doc', desc: 'Generate AI documentation for file', example: 'doc <file>' },
  { name: 'analyze', desc: 'Analyze documentation coverage', example: 'analyze [path]' },
  { name: 'explain', desc: 'Explain file history with AI', example: 'explain <file>' },
  { name: 'pr', desc: 'Generate PR description from commits', example: 'pr [--dry-run]' },
  { name: 'branch', desc: 'AI-powered branch management', example: 'branch [list|create|switch]' },
  { name: 'review', desc: 'AI code review with quality analysis', example: 'review [staged|<file>]' },
  { name: 'resolve', desc: 'AI-assisted merge conflict resolution', example: 'resolve [ai|manual]' },
  { name: 'test', desc: 'Run tests with coverage analysis', example: 'test [--coverage]' },
  { name: 'issues', desc: 'Issue tracker integration', example: 'issues [list|show|link]' },
  { name: 'audit', desc: 'View quality gate audit history', example: 'audit' },
  { name: 'report', desc: 'Generate compliance report', example: 'report [--period week]' },
  { name: 'init', desc: 'Initialize GitPulse hooks and config', example: 'init [--force]' },
  { name: 'mcp', desc: 'Start MCP server for IDE integration', example: 'mcp [start|config]' },
  { name: 'dashboard', desc: 'Open web dashboard for analytics', example: 'dashboard [--port 3001]' },
  { name: 'config', desc: 'Configure GitPulse settings', example: 'config [key] [value]' },
  { name: 'undo', desc: 'Undo last commit safely', example: 'undo [--force]' },
  { name: 'redo', desc: 'Redo last undone commit', example: 'redo' },
  { name: 'model', desc: 'Select AI model', example: 'model' },
  { name: 'quit', desc: 'Exit GitPulse', example: 'quit' }
];

const MODEL_OPTIONS = [
  { alias: 'auto', name: 'Auto - We select for you', model: '', provider: '' },
  { alias: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 120B', model: 'nvidia/nemotron-3-super-120b-a12b:free', provider: 'OpenRouter' },
  { alias: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron Nano 30B', model: 'nvidia/nemotron-3-nano-30b-a3b:free', provider: 'OpenRouter' },
  { alias: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B', model: 'google/gemma-4-31b-it:free', provider: 'OpenRouter' },
  { alias: 'llama-3.3-70b-versatile', name: '3.3-70B', model: 'llama-3.3-70b-versatile', provider: 'Groq' },
  { alias: 'meta-llama/llama-4-scout-17b-16e-instruct', name: '4-Scout', model: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'Groq' },
  { alias: 'llama-3.1-8b-instant', name: '3.1-8B', model: 'llama-3.1-8b-instant', provider: 'Groq' },
  { alias: 'gemini-3.1-flash-lite-preview', name: 'Gemini', model: 'gemini-3.1-flash-lite-preview', provider: 'Google' }
];

export function Welcome({ onCommandSelect }: WelcomeProps) {
  const { exit, showExitWarning } = useGitPulseApp();
  const [input, setInput] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [currentModel, setCurrentModel] = useState(resolveModel(getSetting('model', 'auto')));
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [repoInfo, setRepoInfo] = useState<{ name: string; branch: string; clean: boolean } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [dynamicModelOptions, setDynamicModelOptions] = useState(MODEL_OPTIONS);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [fallbackNotice, setFallbackNotice] = useState<{from: string; to: string; reason: string} | null>(null);
  const [tips] = useState([
    'Type / to see all commands',
    'Use /model to switch AI models',
    'Try "gitpulse analyze" to check documentation coverage',
    '"gitpulse pr" creates comprehensive PR descriptions',
    'Configure AI providers with "gitpulse config"'
  ]);

  const filteredCommands = showCommands 
    ? COMMANDS.filter(cmd => cmd.name.toLowerCase().includes(input.toLowerCase().replace('/', '')))
    : [];

  useEffect(() => {
    loadRecentActivity();
    loadRepoInfo();
    loadOllamaModels();
    loadProviderHealth();
    
    // Refresh health every 30 seconds
    const interval = setInterval(loadProviderHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadProviderHealth() {
    const healthManager = getGlobalHealthManager();
    await healthManager.checkAllHealth();
    setProviderHealth(healthManager.getAllHealth());
  }

  function getProviderStatus(modelAlias: string): { healthy: boolean; circuitOpen: boolean; latency: number } {
    // Map model alias to provider
    let providerName: string | null = null;
    
    if (modelAlias.includes('openrouter') || modelAlias.startsWith('nvidia/') || modelAlias.startsWith('google/gemma')) {
      providerName = 'openrouter';
    } else if (modelAlias.includes('groq') || modelAlias.startsWith('llama-') || modelAlias.startsWith('meta-llama')) {
      providerName = 'groq';
    } else if (modelAlias.includes('gemini')) {
      providerName = 'google';
    } else if (modelAlias.includes('gpt')) {
      providerName = 'openai';
    } else if (!modelAlias.includes('/')) {
      // Assume Ollama for simple model names
      providerName = 'ollama';
    }

    if (!providerName) return { healthy: true, circuitOpen: false, latency: 0 };

    const health = providerHealth.find(h => h.name === providerName);
    if (!health) return { healthy: true, circuitOpen: false, latency: 0 };

    return {
      healthy: health.available && !health.circuitOpen,
      circuitOpen: health.circuitOpen,
      latency: health.averageLatencyMs,
    };
  }

  function getHealthIndicator(status: { healthy: boolean; circuitOpen: boolean; latency: number }): string {
    if (status.circuitOpen) return '🔴'; // Circuit open - failing
    if (!status.healthy) return '🟡'; // Unhealthy
    if (status.latency > 5000) return '🐌'; // Slow
    if (status.latency < 1000) return '⚡'; // Fast
    return '🟢'; // Normal
  }

  async function loadOllamaModels() {
    try {
      const ollamaProvider = AIProviderFactory.create('ollama', {
        ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
        model: ''
      }) as any;
      
      const models = await ollamaProvider.listModels();
      if (models && models.length > 0) {
        setOllamaModels(models);
        
        // Add Ollama models to dynamic options
        const ollamaOptions = models.map((model: string) => ({
          alias: model,
          name: model.split(':')[0], // Remove tag if present (e.g., gemma4:e2b -> gemma4)
          model: model,
          provider: 'Ollama'
        }));
        
        setDynamicModelOptions([...MODEL_OPTIONS, ...ollamaOptions]);
      }
    } catch {
      // Ollama not available, keep default options
      setDynamicModelOptions(MODEL_OPTIONS);
    }
  }

  async function loadRepoInfo() {
    try {
      const git = new GitOperations();
      const isRepo = await git.isRepo();
      if (isRepo) {
        const status = await git.getStatus();
        const cwd = process.cwd();
        setRepoInfo({
          name: path.basename(cwd),
          branch: status.branch,
          clean: status.isClean
        });
      }
    } catch {
      // Not a git repo
    }
  }

  function loadRecentActivity() {
    try {
      const historyPath = path.join(process.cwd(), '.gitpulse-history.json');
      if (fs.existsSync(historyPath)) {
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        setRecentActivity(history.slice(0, 5));
      }
    } catch {
      setRecentActivity([]);
    }
  }

  useEffect(() => {
    setSelectedIndex(0);
  }, [input, showCommands]);

  useEffect(() => {
    if (fallbackNotice) {
      const timeout = setTimeout(() => {
        setFallbackNotice(null);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [fallbackNotice]);

  function executeCommand(commandName: string) {
    if (commandName === 'quit') {
      exit();
    } else if (onCommandSelect) {
      onCommandSelect(commandName);
    }
  }

  useInput((value, key) => {
    if (showModelSelector) {
      if (key.return) {
        const selected = dynamicModelOptions[selectedModelIndex];
        if (selected) {
          setSetting('model', selected.alias);
          setCurrentModel(selected.model);
          setShowModelSelector(false);
        }
      } else if (key.escape) {
        setShowModelSelector(false);
      } else if (key.upArrow) {
        setSelectedModelIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedModelIndex(prev => Math.min(dynamicModelOptions.length - 1, prev + 1));
      }
    } else if (showCommands) {
      if (key.return) {
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          if (selected.name === 'model') {
            setShowModelSelector(true);
            setShowCommands(false);
            setInput('');
          } else {
            executeCommand(selected.name);
          }
        }
      } else if (key.escape) {
        setShowCommands(false);
        setInput('');
      } else if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
      } else if (key.tab) {
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          setInput(selected.example);
        }
      }
      // TextInput handles other keys
    } else {
      if (key.return && input.trim()) {
        const cmd = input.trim().toLowerCase();
        if (cmd === '/model' || cmd === 'model') {
          setShowModelSelector(true);
          setInput('');
        } else {
          executeCommand(cmd);
        }
      } else if (value === '/') {
        setShowCommands(true);
        setInput('/');
      } else if (key.escape) {
        exit();
      }
    }
  });

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <Box flexDirection="column">
      {/* Hermes-inspired Header with ASCII Art */}
      <Header mini subtitle="AI-Powered Git Guardrails" />
      
      {/* Status Line - Clean inline display */}
      <Box flexDirection="row" gap={4} marginY={1}>
        <Text>
          <Text dimColor>Model:</Text>{' '}
          <Text color="cyan">
            {(() => {
              const status = getProviderStatus(currentModel);
              return getHealthIndicator(status);
            })()}
          </Text>{' '}
          <Text>{currentModel.split('/').pop() || currentModel}</Text>
        </Text>
        
        <Text>
          <Text dimColor>Repo:</Text>{' '}
          <Text color="green">{repoInfo ? `${repoInfo.name} (${repoInfo.branch})` : 'None'}</Text>
        </Text>
        
        <Text>
          <Text dimColor>Dir:</Text>{' '}
          <Text dimColor>{process.cwd().split(/[\\/]/).pop() || process.cwd()}</Text>
        </Text>
      </Box>

      {/* Main REPL Area */}
      <Box flexDirection="column" marginTop={1}>
        
        {/* Horizontal Divider */}
        {!showModelSelector && (
          <Box marginBottom={1}>
             <Text dimColor>──────────────────────────────────────────────────────────────────────────────────</Text>
          </Box>
        )}
        
        {/* Model Selector */}
        {showModelSelector ? (
          <Box flexDirection="column" marginBottom={1}>
            <Text dimColor>Select AI Model (health indicators shown):</Text>
            {dynamicModelOptions.map((option, index) => {
              const status = getProviderStatus(option.alias);
              const indicator = getHealthIndicator(status);
              const isDisabled = status.circuitOpen;
              
              return (
                <Box key={option.alias}>
                  <Text 
                    color={selectedModelIndex === index ? 'white' : isDisabled ? 'red' : 'gray'} 
                    bold={selectedModelIndex === index}
                    dimColor={isDisabled}
                  >
                    {selectedModelIndex === index ? '❯ ' : '  '}
                    {indicator} {option.alias}
                    {status.circuitOpen && ' [unavailable]'}
                    {!status.circuitOpen && status.latency > 0 && ` (${Math.round(status.latency)}ms)`}
                  </Text>
                </Box>
              );
            })}
            <Box marginTop={1}>
              <Text dimColor>
                ⚡ Fast | 🟢 Normal | 🐌 Slow | 🟡 Unhealthy | 🔴 Unavailable
              </Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            {/* Input Prompt */}
            <Box flexDirection="row" alignItems="center">
              <Text color="white" bold>❯ </Text>
              <TextInput 
                value={input} 
                onChange={(newVal) => {
                  setInput(newVal);
                  if (newVal === '') {
                    setShowCommands(false);
                  } else if (newVal.startsWith('/')) {
                    setShowCommands(true);
                  }
                }}
                placeholder=" "
                showCursor={true}
                focus={true}
              />
            </Box>
            
            {/* Horizontal Divider Below Prompt */}
            {!showCommands && (
               <Box marginTop={1} flexDirection="row" justifyContent="space-between">
                 <Text dimColor>──────────────────────────────────────────────────────────────────────────────────</Text>
               </Box>
            )}

            {!showCommands && (
               <Box marginTop={0} flexDirection="row" justifyContent="space-between">
                 <Text dimColor={!showExitWarning} color={showExitWarning ? "yellow" : undefined}>
                    {showExitWarning ? "(Press Ctrl+C again to quit)" : 
                     fallbackNotice ? `⚡ Fallback: ${fallbackNotice.from} → ${fallbackNotice.to}` : 
                     "Type / for commands or ? for shortcuts"}
                 </Text>
                 <Text dimColor>• {currentModel.split('/').pop() || currentModel} • /model</Text>
               </Box>
            )}
            
            {/* Suggestions */}
            {showCommands && filteredCommands.length > 0 && (
              <Box flexDirection="column" marginTop={1} marginLeft={2}>
                {filteredCommands.slice(0, 5).map((cmd, index) => (
                  <Box key={cmd.name}>
                    <Text color={selectedIndex === index ? "white" : "gray"} bold={selectedIndex === index}>
                      {selectedIndex === index ? '❯ ' : '  '}{cmd.name}
                    </Text>
                    <Text dimColor> — {cmd.desc}</Text>
                  </Box>
                ))}
              </Box>
            )}
            
            {showCommands && filteredCommands.length === 0 && input.length > 1 && (
              <Box marginTop={1} marginLeft={2}>
                <Text color="red">No commands found</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default Welcome;
