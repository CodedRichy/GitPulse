import React, { useState, useEffect } from 'react';
import {  Box, Text, useInput, useApp  } from "ink";
import { useGitPulseApp } from "./useGitPulseApp.js";;
import TextInput from 'ink-text-input';
import { ChatMessage, StatusBar, SectionDivider } from './ui.js';
import * as fs from 'fs';
import * as path from 'path';
import { GitOperations } from '../core/git.js';
import { MODEL_ALIASES, resolveModel } from '../utils/config.js';
import { getSetting, setSetting } from '../utils/settings.js';
import { AIProviderFactory } from '../ai/providers.js';

interface RecentActivity {
  type: 'commit' | 'doc' | 'pr' | 'analyze';
  description: string;
  timestamp: Date;
}

interface WelcomeProps {
  onCommandSelect?: (command: string) => void;
}

const COMMANDS = [
  { name: 'commit', desc: 'Generate AI commit message', example: 'commit' },
  { name: 'status', desc: 'View repository status', example: 'status' },
  { name: 'doc', desc: 'Generate documentation for file', example: 'doc <file>' },
  { name: 'analyze', desc: 'Analyze documentation coverage', example: 'analyze [path]' },
  { name: 'pr', desc: 'Generate PR description', example: 'pr' },
  { name: 'explain', desc: 'Explain file history', example: 'explain <file>' },
  { name: 'model', desc: 'Select AI model', example: 'model' },
  { name: 'config', desc: 'Configure settings', example: 'config' },
  { name: 'undo', desc: 'Undo last commit', example: 'undo' },
  { name: 'redo', desc: 'Redo last undone commit', example: 'redo' },
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
  const { exit } = useApp();
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
  }, []);

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
    <Box flexDirection="column" paddingLeft={1}>
      {/* Header Info */}
      {!showCommands && !showModelSelector && input.length === 0 && (
        <Box marginBottom={1} flexDirection="column">
          <Text dimColor>
            GitPulse <Text color="gray">v3.0</Text> • Repository: {repoInfo ? `${repoInfo.name} (${repoInfo.branch})` : 'None'} • AI: {currentModel.split('/').pop() || currentModel}
          </Text>
        </Box>
      )}

      {/* Main REPL Area */}
      <Box flexDirection="column">
        
        {/* Model Selector */}
        {showModelSelector ? (
          <Box flexDirection="column" marginBottom={1}>
            <Text dimColor>Select AI Model:</Text>
            {dynamicModelOptions.map((option, index) => (
              <Box key={option.alias}>
                <Text color={selectedModelIndex === index ? 'white' : 'gray'} bold={selectedModelIndex === index}>
                  {selectedModelIndex === index ? '❯ ' : '  '}
                  {option.alias}
                </Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Box flexDirection="column">
            {/* Input Prompt */}
            <Box flexDirection="row" alignItems="center">
              <Text color={showCommands ? "cyan" : "gray"} bold>◆ </Text>
              {!showCommands && input.length === 0 ? (
                 <Text dimColor>Type / for commands, or type normally...</Text>
              ) : (
                 <TextInput 
                   value={input} 
                   onChange={setInput}
                   showCursor={true}
                   focus={true}
                 />
              )}
            </Box>
            
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

      {/* Hidden status bar logic could remain if needed, but we wanted a clean UI */}
    </Box>
  );
}

export default Welcome;
