import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState } from 'react';
import {   Box, Text, useInput, useApp   } from "ink";
import { loadConfig, saveConfig, resetConfig } from '../utils/config.js';
import { Config } from '../core/models.js';
import { ChatMessage, StatusBar, SuccessCheck, SectionDivider } from './ui.js';

interface ConfigPanelProps {
  args: string[];
}

export function ConfigPanel({ args }: ConfigPanelProps) {
  const { exit } = useApp();
  const [action] = useState(args[0] || 'show');
  const [config, setConfig] = useState<Config>(loadConfig());
  const [message, setMessage] = useState<string>('');

  useInput((input) => {
    if (message.includes('reset')) {
      if (input === 'y' || input === 'Y') {
        resetConfig();
        setMessage('Configuration reset to defaults');
        setTimeout(() => exit(), 1000);
      } else {
        exit();
      }
    }
  });

  // Handle different config actions
  if (action === 'show' || action === 'get') {
    return (
      <Box flexDirection="column">
        <ChatMessage role="assistant">
          <Box flexDirection="column">
            <Text bold>Current Configuration</Text>
            <SectionDivider />
            <Box flexDirection="column" marginLeft={2}>
              <Text><Text bold color="#10B981">AI Provider:</Text> {config.aiProvider}</Text>
              <Text><Text bold color="#10B981">Commit Style:</Text> {config.commitStyle}</Text>
              <Text><Text bold color="#10B981">Auto Commit:</Text> {config.autoCommit ? 'enabled' : 'disabled'}</Text>
              {config.ollamaHost && (
                <Text><Text bold color="#10B981">Ollama Host:</Text> {config.ollamaHost}</Text>
              )}
              {config.ollamaModel && (
                <Text><Text bold color="#10B981">Ollama Model:</Text> {config.ollamaModel}</Text>
              )}
              {config.openrouterApiKey && (
                <Text><Text bold color="#10B981">OpenRouter Key:</Text> {config.openrouterApiKey.substring(0, 8)}...</Text>
              )}
            </Box>
          </Box>
        </ChatMessage>
        <StatusBar mode="config" />
      </Box>
    );
  }

  if (action === 'set' && args.length >= 3) {
    const [, key, value] = args;
    const validKeys = ['aiProvider', 'commitStyle', 'autoCommit', 'ollamaHost', 'ollamaModel'];
    
    if (!validKeys.includes(key)) {
      return (
        <Box flexDirection="column">
          <ChatMessage role="system">
            <Text color="red">Invalid config key: {key}</Text>
          </ChatMessage>
          <ChatMessage role="assistant">
            <Text>Valid keys:</Text>
            <Box marginLeft={2} flexDirection="column">
              {validKeys.map(k => <Text key={k}>• {k}</Text>)}
            </Box>
          </ChatMessage>
          <StatusBar mode="error" />
        </Box>
      );
    }

    const typedValue = key === 'autoCommit' ? value === 'true' : value;
    saveConfig({ [key]: typedValue });
    
    return (
      <Box flexDirection="column">
        <ChatMessage role="assistant">
          <SuccessCheck text={`Set ${key} = ${value}`} />
        </ChatMessage>
        <StatusBar mode="config" />
      </Box>
    );
  }

  if (action === 'reset') {
    if (!message) {
      setMessage('Are you sure you want to reset all configuration? [y/N]');
    }
    return (
      <Box flexDirection="column">
        <ChatMessage role="system">
          <Text color="yellow">{message}</Text>
        </ChatMessage>
        <StatusBar mode="confirm" />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <ChatMessage role="assistant">
        <Box flexDirection="column">
          <Text bold>Configuration Commands</Text>
          <SectionDivider />
          <Box marginLeft={2} flexDirection="column">
            <Text><Text color="#10B981">show</Text> - Display current configuration</Text>
            <Text><Text color="#10B981">set &lt;key&gt; &lt;value&gt;</Text> - Update a setting</Text>
            <Text><Text color="#10B981">reset</Text> - Reset to defaults</Text>
          </Box>
          <SectionDivider />
          <Text dimColor>Valid keys: aiProvider, commitStyle, autoCommit, ollamaHost, ollamaModel</Text>
        </Box>
      </ChatMessage>
      <StatusBar mode="config" />
    </Box>
  );
}

export default ConfigPanel;
