import axios, { AxiosInstance } from 'axios';
import { AIProvider } from '../core/models.js';
import { loadConfig, getAIProviderConfig } from '../utils/config.js';
import { autoSelectModel } from './model-selector.js';

/**
 * OpenRouter AI Provider
 */
export class OpenRouterProvider implements AIProvider {
  name = 'openrouter';
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'google/gemma-2-9b-it:free') {
    this.apiKey = apiKey;
    this.model = model;
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/auth/key');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Ollama Local AI Provider
 */
export class OllamaProvider implements AIProvider {
  name = 'ollama';
  private client: AxiosInstance;
  private model: string;

  constructor(host: string = 'http://localhost:11434', model: string = 'llama3.2') {
    this.model = model;
    this.client = axios.create({
      baseURL: host,
      timeout: 120000
    });
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.post('/api/generate', {
        model: this.model,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false,
        options: {
          temperature: 0.3
        }
      });

      return response.data.response || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Ollama API error: ${error.message}`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      return models.some((m: { name: string }) => m.name === this.model || m.name.startsWith(this.model));
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      return models.map((m: { name: string }) => m.name);
    } catch {
      return [];
    }
  }
}

/**
 * OpenAI Provider
 */
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/models');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Google Gemini Provider
 */
export class GoogleProvider implements AIProvider {
  name = 'google';
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.client = axios.create({
      baseURL: `https://generativelanguage.googleapis.com/v1beta/models/${model}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.post(':generateContent', {
        contents: [
          ...(systemPrompt ? [{ role: 'user', parts: [{ text: systemPrompt }] }] : []),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000
        }
      }, {
        params: {
          key: this.apiKey
        }
      });

      return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Google API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.post(':generateContent', {
        contents: [{ role: 'user', parts: [{ text: 'test' }] }],
        generationConfig: { maxOutputTokens: 10 }
      }, {
        params: { key: this.apiKey }
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Groq Provider
 */
export class GroqProvider implements AIProvider {
  name = 'groq';
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'llama3-70b-8192') {
    this.apiKey = apiKey;
    this.model = model;
    this.client = axios.create({
      baseURL: 'https://api.groq.com/openai/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 1000
      });

      return response.data.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Groq API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.post('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * AI Provider Factory
 */
export class AIProviderFactory {
  static create(
    provider: 'openrouter' | 'ollama' | 'openai' | 'google' | 'groq' | 'anthropic' | 'auto',
    config: {
      openrouterApiKey?: string;
      ollamaHost?: string;
      ollamaModel?: string;
      openaiApiKey?: string;
      googleApiKey?: string;
      groqApiKey?: string;
      model?: string;
    }
  ): AIProvider {
    // Handle 'auto' by selecting first available provider
    if (provider === 'auto') {
      // Try providers in order of preference
      if (config.openrouterApiKey) {
        provider = 'openrouter';
      } else if (config.ollamaHost) {
        provider = 'ollama';
      } else if (config.googleApiKey) {
        provider = 'google';
      } else if (config.groqApiKey) {
        provider = 'groq';
      } else {
        // Default to ollama if no API keys available
        provider = 'ollama';
      }
    }

    switch (provider) {
      case 'openrouter':
        if (!config.openrouterApiKey) {
          throw new Error('OpenRouter API key is required');
        }
        return new OpenRouterProvider(config.openrouterApiKey, config.model);
      
      case 'ollama':
        return new OllamaProvider(config.ollamaHost, config.model || config.ollamaModel);
      
      case 'openai':
        if (!config.openaiApiKey) {
          throw new Error('OpenAI API key is required');
        }
        return new OpenAIProvider(config.openaiApiKey, config.model);
      
      case 'google':
        if (!config.googleApiKey) {
          throw new Error('Google API key is required');
        }
        return new GoogleProvider(config.googleApiKey, config.model);
      
      case 'groq':
        if (!config.groqApiKey) {
          throw new Error('Groq API key is required');
        }
        return new GroqProvider(config.groqApiKey, config.model);
      
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  /**
   * Get available providers
   */
  static async getAvailableProviders(config: {
    openrouterApiKey?: string;
    ollamaHost?: string;
    ollamaModel?: string;
    openaiApiKey?: string;
    model?: string;
  }): Promise<string[]> {
    const available: string[] = [];
    const providers: Array<{ name: string; instance: AIProvider }> = [];

    if (config.openrouterApiKey) {
      providers.push({ name: 'openrouter', instance: new OpenRouterProvider(config.openrouterApiKey, config.model) });
    }
    
    providers.push({ 
      name: 'ollama', 
      instance: new OllamaProvider(config.ollamaHost, config.model || config.ollamaModel) 
    });
    
    if (config.openaiApiKey) {
      providers.push({ name: 'openai', instance: new OpenAIProvider(config.openaiApiKey, config.model) });
    }

    for (const { name, instance } of providers) {
      try {
        if (await instance.isAvailable()) {
          available.push(name);
        }
      } catch {
        // Provider not available
      }
    }

    return available;
  }
}

/**
 * Get the configured AI provider instance
 */
export function getAIProvider(): AIProvider | null {
  const config = loadConfig();
  const providerConfig = getAIProviderConfig();

  try {
    return AIProviderFactory.create(config.aiProvider as 'ollama' | 'openrouter' | 'openai' | 'google' | 'groq', {
      openrouterApiKey: providerConfig.openrouterApiKey,
      ollamaHost: providerConfig.ollamaHost,
      ollamaModel: providerConfig.ollamaModel,
      openaiApiKey: providerConfig.openaiApiKey,
      googleApiKey: providerConfig.googleApiKey,
      groqApiKey: providerConfig.groqApiKey,
      model: providerConfig.model,
    });
  } catch (error) {
    // Silently return null if provider creation fails
    return null;
  }
}

/**
 * Uses AI to pick the best model based on task context
 */
export async function getAIProviderWithAutoSelection(taskContext: {
  taskType: 'commit_message' | 'code_documentation' | 'code_review' | 'refactoring' | 'general';
  complexity?: 'simple' | 'medium' | 'complex';
  priority?: 'speed' | 'quality' | 'balanced';
}): Promise<AIProvider | null> {
  const config = loadConfig();
  const providerConfig = getAIProviderConfig();

  // Check if model is 'auto'
  if (providerConfig.model === '' || providerConfig.model === 'auto') {
    try {
      // Use AI to select the best model for this task
      const selection = await autoSelectModel({
        taskType: taskContext.taskType,
        complexity: taskContext.complexity || 'medium',
        priority: taskContext.priority || 'balanced',
        offlineMode: config.aiProvider === 'ollama'
      });

      // Update provider config with selected model
      providerConfig.model = selection.model;
      
      // Determine provider from selection
      let provider = config.aiProvider === 'auto' ? 'ollama' : config.aiProvider;
      if (selection.provider === 'groq') provider = 'groq' as const;
      else if (selection.provider === 'google') provider = 'google' as const;
      else if (selection.provider === 'openrouter') provider = 'openrouter' as const;
      else if (selection.provider === 'ollama') provider = 'ollama' as const;

      return AIProviderFactory.create(provider as 'ollama' | 'openrouter' | 'openai' | 'google' | 'groq', {
        openrouterApiKey: providerConfig.openrouterApiKey,
        ollamaHost: providerConfig.ollamaHost,
        ollamaModel: selection.provider === 'ollama' ? selection.model : providerConfig.ollamaModel,
        openaiApiKey: providerConfig.openaiApiKey,
        model: selection.model,
      });
    } catch {
      // Fallback to default behavior
      return getAIProvider();
    }
  }

  // Not auto, use configured model
  return getAIProvider();
}

export default AIProviderFactory;
