import React, { useState, useEffect } from 'react';
import {  Box, Text, useInput, useApp  } from "ink";
import { useGitPulseApp } from "./useGitPulseApp.js";;
import TextInput from 'ink-text-input';
import { ChatMessage, Spinner, SuccessCheck, ErrorX, SectionDivider } from './ui.js';
import { saveConfig } from '../utils/config.js';
import { setSetting } from '../utils/settings.js';
import { AIProviderFactory } from '../ai/providers.js';

interface LoginProps {
  onLoginComplete: () => void;
}

type LoginStep = 'provider' | 'openrouter-key' | 'ollama-config' | 'testing' | 'success' | 'error';

export function Login({ onLoginComplete }: LoginProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<LoginStep>('provider');
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'openrouter' | 'ollama'>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('');
  const [focusField, setFocusField] = useState<'host' | 'model'>('host');

  useEffect(() => {
    // Auto-detect available providers
    async function detectProviders() {
      // Check if Ollama is available
      try {
        const ollamaProvider = AIProviderFactory.create('ollama', { ollamaHost: 'http://localhost:11434', ollamaModel: '', model: '' }) as any;
        const ollamaAvailable = await ollamaProvider.isAvailable();
        
        if (ollamaAvailable) {
          // Get available models
          const models = await ollamaProvider.listModels();
          if (models.length > 0) {
            setSelectedProvider('ollama');
            const firstModel = models[0];
            setOllamaModel(firstModel);
            testAndSaveOllama('http://localhost:11434', firstModel);
            return;
          }
        }
      } catch {
        // Ollama not available, continue
      }

      // Check if OpenRouter API key exists in environment
      if (process.env.OPENROUTER_API_KEY) {
        setSelectedProvider('openrouter');
        setApiKey(process.env.OPENROUTER_API_KEY);
        testAndSaveOpenRouter(process.env.OPENROUTER_API_KEY);
        return;
      }

      // No auto-detected provider, show selection screen
      setStep('provider');
    }

    detectProviders();
  }, []);

  useInput((input, key) => {
    if (step === 'provider') {
      if (input === '1') {
        setSelectedProvider('openrouter');
        setStep('openrouter-key');
      } else if (input === '2') {
        setSelectedProvider('ollama');
        setStep('ollama-config');
      } else if (key.escape) {
        exit();
      }
    } else if (step === 'openrouter-key') {
      if (key.return && apiKey.trim()) {
        testAndSaveOpenRouter(apiKey.trim());
      } else if (key.escape) {
        setStep('provider');
        setApiKey('');
      }
    } else if (step === 'ollama-config') {
      if (key.return) {
        if (focusField === 'host') {
          setFocusField('model');
        } else {
          testAndSaveOllama(ollamaHost, ollamaModel);
        }
      } else if (key.escape) {
        setStep('provider');
        setOllamaHost('http://localhost:11434');
        setOllamaModel('llama3.2');
        setFocusField('host');
      } else if (key.tab) {
        setFocusField(prev => prev === 'host' ? 'model' : 'host');
      }
    } else if (step === 'error') {
      if (key.return || key.escape) {
        setStep('provider');
        setError('');
      }
    } else if (step === 'success') {
      if (key.return || key.escape || input === ' ') {
        onLoginComplete();
      }
    }
  });

  async function testAndSaveOpenRouter(key: string) {
    setStep('testing');
    try {
      const provider = AIProviderFactory.create('openrouter', { openrouterApiKey: key, model: 'google/gemma-2-9b-it:free' });
      const isAvailable = await provider.isAvailable();
      
      if (isAvailable) {
        saveConfig({
          aiProvider: 'openrouter',
          openrouterApiKey: key
        });
        setSetting('model', 'default');
        setStep('success');
      } else {
        throw new Error('API key validation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API key');
      setStep('error');
    }
  }

  async function testAndSaveOllama(host: string, model: string) {
    setStep('testing');
    try {
      const provider = AIProviderFactory.create('ollama', { ollamaHost: host, ollamaModel: model, model: model });
      const isAvailable = await provider.isAvailable();
      
      if (isAvailable) {
        saveConfig({
          aiProvider: 'ollama',
          ollamaHost: host,
          ollamaModel: model
        });
        setSetting('model', 'default');
        setStep('success');
      } else {
        throw new Error(`Ollama not available at ${host} or model ${model} not found`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Ollama');
      setStep('error');
    }
  }

  return (
    <Box flexDirection="column">
      <ChatMessage role="assistant">
        <Box flexDirection="column">
          <Text bold color="#D4A5FF">Welcome to GitPulse</Text>
          <SectionDivider />
          <Text>AI-powered Git workflow assistant</Text>
          <Box marginTop={1}>
            <Text dimColor>Configure your AI provider to get started</Text>
          </Box>
        </Box>
      </ChatMessage>

      {step === 'provider' && (
        <ChatMessage role="system">
          <Box flexDirection="column">
            <Text bold>Select AI Provider:</Text>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text color={selectedProvider === 'openrouter' ? '#D4A5FF' : undefined}>
                  {selectedProvider === 'openrouter' ? '▸ ' : '  '}
                </Text>
                <Text bold color="#50FA7B">[1]</Text>
                <Text> OpenRouter (cloud, requires API key)</Text>
              </Box>
              <Box>
                <Text color={selectedProvider === 'ollama' ? '#D4A5FF' : undefined}>
                  {selectedProvider === 'ollama' ? '▸ ' : '  '}
                </Text>
                <Text bold color="#50FA7B">[2]</Text>
                <Text> Ollama (local, free)</Text>
              </Box>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Press 1 or 2 to select, Esc to exit</Text>
            </Box>
          </Box>
        </ChatMessage>
      )}

      {step === 'openrouter-key' && (
        <ChatMessage role="system">
          <Box flexDirection="column">
            <Text bold>Enter OpenRouter API Key:</Text>
            <Box marginTop={1}>
              <Text color="#D4A5FF">❯ </Text>
              <TextInput
                value={apiKey}
                onChange={setApiKey}
                showCursor={true}
                focus={true}
                mask="*"
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Get your key at </Text>
              <Text color="#8BE9FD">openrouter.ai/keys</Text>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Enter to continue, Esc to go back</Text>
            </Box>
          </Box>
        </ChatMessage>
      )}

      {step === 'ollama-config' && (
        <ChatMessage role="system">
          <Box flexDirection="column">
            <Text bold>Configure Ollama:</Text>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text dimColor>Host:</Text>
                <Box marginLeft={2}>
                  <TextInput
                    value={ollamaHost}
                    onChange={setOllamaHost}
                    showCursor={focusField === 'host'}
                    focus={focusField === 'host'}
                  />
                </Box>
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Model:</Text>
                <Box marginLeft={2}>
                  <TextInput
                    value={ollamaModel}
                    onChange={setOllamaModel}
                    showCursor={focusField === 'model'}
                    focus={focusField === 'model'}
                  />
                </Box>
              </Box>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Tab to switch fields, Enter to test, Esc to go back</Text>
            </Box>
          </Box>
        </ChatMessage>
      )}

      {step === 'testing' && (
        <ChatMessage role="assistant" loading>
          <Spinner text="Testing connection..." />
        </ChatMessage>
      )}

      {step === 'success' && (
        <ChatMessage role="assistant">
          <SuccessCheck text="Authentication successful!" />
          <Box marginTop={1}>
            <Text dimColor>Press Enter or Space to continue</Text>
          </Box>
        </ChatMessage>
      )}

      {step === 'error' && (
        <ChatMessage role="system">
          <ErrorX text={error} />
          <Box marginTop={1}>
            <Text dimColor>Press Enter to try again</Text>
          </Box>
        </ChatMessage>
      )}
    </Box>
  );
}

export default Login;
