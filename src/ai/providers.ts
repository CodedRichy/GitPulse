import axios, { AxiosInstance } from 'axios';
import { AIProvider } from '../core/models.js';

/**
 * OpenRouter AI Provider
 */
export class OpenRouterProvider implements AIProvider {
  name = 'openrouter';
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
        model: 'google/gemma-2-9b-it:free',
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
 * AI Provider Factory
 */
export class AIProviderFactory {
  static create(
    provider: 'openrouter' | 'ollama' | 'openai' | 'anthropic',
    config: {
      openrouterApiKey?: string;
      ollamaHost?: string;
      ollamaModel?: string;
      openaiApiKey?: string;
    }
  ): AIProvider {
    switch (provider) {
      case 'openrouter':
        if (!config.openrouterApiKey) {
          throw new Error('OpenRouter API key is required');
        }
        return new OpenRouterProvider(config.openrouterApiKey);
      
      case 'ollama':
        return new OllamaProvider(config.ollamaHost, config.ollamaModel);
      
      case 'openai':
        if (!config.openaiApiKey) {
          throw new Error('OpenAI API key is required');
        }
        return new OpenAIProvider(config.openaiApiKey);
      
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
  }): Promise<string[]> {
    const available: string[] = [];
    const providers: Array<{ name: string; instance: AIProvider }> = [];

    if (config.openrouterApiKey) {
      providers.push({ name: 'openrouter', instance: new OpenRouterProvider(config.openrouterApiKey) });
    }
    
    providers.push({ 
      name: 'ollama', 
      instance: new OllamaProvider(config.ollamaHost, config.ollamaModel) 
    });
    
    if (config.openaiApiKey) {
      providers.push({ name: 'openai', instance: new OpenAIProvider(config.openaiApiKey) });
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

export default AIProviderFactory;
