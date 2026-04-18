import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from "ink";
import TextInput from 'ink-text-input';
import { Spinner, SuccessCheck, ErrorX } from './ui.js';
import { saveConfig } from '../utils/config.js';
import { setSetting } from '../utils/settings.js';
import { AIProviderFactory } from '../ai/providers.js';
import { AccountService } from '../core/auth.js';

interface LoginProps {
  onLoginComplete: () => void;
}

type LoginStep = 'provider' | 'openrouter-key' | 'ollama-config' | 'oauth' | 'testing' | 'success' | 'error';

export function Login({ onLoginComplete }: LoginProps) {
  const { exit } = useGitPulseApp();
  const [step, setStep] = useState<LoginStep>('provider');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const providers = ['openrouter', 'ollama', 'github'] as const;
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const [apiKey, setApiKey] = useState('');
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('');
  const [focusField, setFocusField] = useState<'host' | 'model'>('host');

  useEffect(() => {
    async function detectProviders() {
      try {
        const ollamaProvider = AIProviderFactory.create('ollama', { ollamaHost: 'http://localhost:11434', ollamaModel: '', model: '' }) as any;
        const ollamaAvailable = await ollamaProvider.isAvailable();

        if (ollamaAvailable) {
          const models = await ollamaProvider.listModels();
          if (models.length > 0) {
            setSelectedIndex(1);
            const firstModel = models[0];
            setOllamaModel(firstModel);
            testAndSaveOllama('http://localhost:11434', firstModel);
            return;
          }
        }
      } catch (error) {
        // Ollama not available, continue to check other providers
      }

      if (process.env.OPENROUTER_API_KEY) {
        setSelectedIndex(0);
        setApiKey(process.env.OPENROUTER_API_KEY);
        testAndSaveOpenRouter(process.env.OPENROUTER_API_KEY);
        return;
      }
      setStep('provider');
    }
    detectProviders();
  }, []);

  useInput((input, key) => {
    if (step === 'provider') {
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(providers.length - 1, prev + 1));
      } else if (input === '1') {
        setSelectedIndex(0);
        setStep('openrouter-key');
      } else if (input === '2') {
        setSelectedIndex(1);
        setStep('ollama-config');
      } else if (input === '3') {
        setSelectedIndex(2);
        handleOAuth();
      } else if (key.return) {
        const sel = providers[selectedIndex];
        if (sel === 'openrouter') setStep('openrouter-key');
        if (sel === 'ollama') setStep('ollama-config');
        if (sel === 'github') handleOAuth();
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
        saveConfig({ aiProvider: 'openrouter', openrouterApiKey: key });
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
        saveConfig({ aiProvider: 'ollama', ollamaHost: host, ollamaModel: model });
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

  const handleOAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const accountService = new AccountService();
      await accountService.loginWithOAuth('github');
      setStep('success');
      setTimeout(() => onLoginComplete(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
      setStep('error');
    }
  };

  return (
    <Box flexDirection="column" paddingX={0}>
      <Text color="#10B981" bold>Welcome to GitPulse v3.0</Text>
      <Box marginBottom={1}>
        <Text dimColor>{"──────────────────────────────────────────────────────────────────────────────────"}</Text>
      </Box>

      {/* GitPulse Heartbeat ASCII Art */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="#10B981">{"                                                        "}</Text>
        <Text color="#10B981">{"        ██████╗ ██╗████████╗██████╗ ██╗   ██╗██╗      ███████╗███████╗"}</Text>
        <Text color="#10B981">{"       ██╔════╝ ██║╚══██╔══╝██╔══██╗██║   ██║██║      ██╔════╝██╔════╝"}</Text>
        <Text color="#10B981">{"       ██║  ███╗██║   ██║   ██████╔╝██║   ██║██║      ███████╗█████╗  "}</Text>
        <Text color="#10B981">{"       ██║   ██║██║   ██║   ██╔═══╝ ██║   ██║██║      ╚════██║██╔══╝  "}</Text>
        <Text color="#10B981">{"       ╚██████╔╝██║   ██║   ██║     ╚██████╔╝███████╗ ███████║███████╗"}</Text>
        <Text color="#10B981">{"        ╚═════╝ ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝ ╚══════╝╚══════╝"}</Text>
        <Text color="#10B981">{"                                                        "}</Text>
        <Text color="gray">{"       AI-powered Git workflows                          "}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>{"──────────────────────────────────────────────────────────────────────────────────"}</Text>
      </Box>

      {step === 'provider' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>Let's get started.</Text>
          </Box>
          <Box flexDirection="column" marginBottom={1}>
            <Text>Choose the AI Provider that works best for you</Text>
            <Text dimColor>To change this later, run /config</Text>
          </Box>

          <Box flexDirection="column">
            <Box>
              <Text color={selectedIndex === 0 ? "white" : "gray"} bold={selectedIndex === 0}>
                {selectedIndex === 0 ? '❯ ' : '  '}1. OpenRouter (cloud, requires API key)
              </Text>
            </Box>
            <Box>
              <Text color={selectedIndex === 1 ? "white" : "gray"} bold={selectedIndex === 1}>
                {selectedIndex === 1 ? '❯ ' : '  '}2. Ollama (local, free)
              </Text>
            </Box>
            <Box>
              <Text color={selectedIndex === 2 ? "white" : "gray"} bold={selectedIndex === 2}>
                {selectedIndex === 2 ? '❯ ' : '  '}3. GitHub (OAuth)
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {step === 'openrouter-key' && (
        <Box flexDirection="column">
          <Text bold>Enter OpenRouter API Key:</Text>
          <Box marginTop={1} flexDirection="row" alignItems="center">
            <Text color="white" bold>❯ </Text>
            <TextInput
              value={apiKey}
              onChange={setApiKey}
              showCursor={true}
              focus={true}
              mask="*"
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Get your key at openrouter.ai/keys</Text>
            <Text dimColor>Enter to continue, Esc to go back</Text>
          </Box>
        </Box>
      )}

      {step === 'ollama-config' && (
        <Box flexDirection="column">
          <Text bold>Configure Ollama:</Text>
          <Box marginTop={1} flexDirection="column">
            <Box flexDirection="row">
              <Text dimColor>Host:  </Text>
              <TextInput
                value={ollamaHost}
                onChange={setOllamaHost}
                showCursor={focusField === 'host'}
                focus={focusField === 'host'}
              />
            </Box>
            <Box flexDirection="row" marginTop={1}>
              <Text dimColor>Model: </Text>
              <TextInput
                value={ollamaModel}
                onChange={setOllamaModel}
                showCursor={focusField === 'model'}
                focus={focusField === 'model'}
              />
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Tab to switch fields, Enter to test, Esc to go back</Text>
          </Box>
        </Box>
      )}

      {step === 'oauth' && (
        <Box flexDirection="column">
          <Text bold>GitHub OAuth Authentication</Text>
          <Box marginTop={1}>
            <Spinner text="Opening browser for authentication..." />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Authorize GitPulse to access your GitHub account</Text>
          </Box>
        </Box>
      )}

      {step === 'testing' && (
        <Box flexDirection="column">
          <Spinner text="Testing connection..." />
        </Box>
      )}

      {step === 'success' && (
        <Box flexDirection="column">
          <SuccessCheck text="Authentication successful!" />
          <Box marginTop={1}>
            <Text dimColor>Press Enter or Space to continue</Text>
          </Box>
        </Box>
      )}

      {step === 'error' && (
        <Box flexDirection="column">
          <ErrorX text={error} />
          <Box marginTop={1}>
            <Text dimColor>Press Enter to try again</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default Login;
