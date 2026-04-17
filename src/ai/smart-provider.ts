import { AIProvider } from '../core/models.js';
import { AIProviderFactory } from './providers.js';
import { 
  ProviderHealthManager, 
  getGlobalHealthManager,
  ProviderHealth 
} from './provider-health.js';
import { loadConfig, getAIProviderConfig } from '../utils/config.js';
import { autoSelectModel } from './model-selector.js';

export interface FallbackResult {
  provider: AIProvider;
  providerName: string;
  model: string;
  usedFallback: boolean;
  fallbackFrom?: string;
  fallbackReason?: string;
  health: ProviderHealth;
}

export interface SmartProviderConfig {
  preferredProvider?: string;
  preferredModel?: string;
  enableFallback: boolean;
  enableCircuitBreaker: boolean;
  maxRetries: number;
  fallbackTimeoutMs: number;
}

const DEFAULT_CONFIG: SmartProviderConfig = {
  enableFallback: true,
  enableCircuitBreaker: true,
  maxRetries: 2,
  fallbackTimeoutMs: 10000,
};

/**
 * Smart Provider with automatic fallback and health-based selection
 */
export class SmartProvider {
  private healthManager: ProviderHealthManager;
  private config: SmartProviderConfig;

  constructor(config: Partial<SmartProviderConfig> = {}) {
    this.healthManager = getGlobalHealthManager();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Register all known providers
    this.registerProviders();
    
    // Start health polling
    if (this.config.enableCircuitBreaker) {
      this.healthManager.startHealthPolling();
    }
  }

  /**
   * Register all configured providers with health manager
   */
  private registerProviders(): void {
    const providerConfig = getAIProviderConfig();
    const appConfig = loadConfig();
    
    // Register OpenRouter if API key exists
    if (providerConfig.openrouterApiKey) {
      this.healthManager.registerProvider('openrouter', {
        openrouterApiKey: providerConfig.openrouterApiKey,
        model: providerConfig.model,
      });
    }

    // Always register Ollama (local)
    this.healthManager.registerProvider('ollama', {
      ollamaHost: providerConfig.ollamaHost,
      ollamaModel: providerConfig.ollamaModel,
    });

    // Register OpenAI if API key exists
    if (providerConfig.openaiApiKey) {
      this.healthManager.registerProvider('openai', {
        openaiApiKey: providerConfig.openaiApiKey,
        model: providerConfig.model,
      });
    }

    // Register Google if API key exists
    if (providerConfig.googleApiKey) {
      this.healthManager.registerProvider('google', {
        googleApiKey: providerConfig.googleApiKey,
        model: providerConfig.model,
      });
    }

    // Register Groq if API key exists
    if (providerConfig.groqApiKey) {
      this.healthManager.registerProvider('groq', {
        groqApiKey: providerConfig.groqApiKey,
        model: providerConfig.model,
      });
    }
  }

  /**
   * Get the best available provider with fallback support
   */
  async getProvider(taskContext?: {
    taskType: 'commit_message' | 'code_documentation' | 'code_review' | 'refactoring' | 'general';
    complexity?: 'simple' | 'medium' | 'complex';
    priority?: 'speed' | 'quality' | 'balanced';
  }): Promise<FallbackResult | null> {
    const appConfig = loadConfig();
    const providerConfig = getAIProviderConfig();

    // Get list of all registered providers
    const allProviders = Array.from(this.healthManager.getAllHealth()).map(h => h.name);
    
    // If auto model selection, determine provider from task context
    let preferredProvider = this.config.preferredProvider || appConfig.aiProvider;
    let preferredModel = this.config.preferredModel || providerConfig.model;

    if (preferredModel === 'auto' || preferredModel === '' || !preferredModel) {
      if (taskContext) {
        try {
          const selection = await autoSelectModel({
            taskType: taskContext.taskType,
            complexity: taskContext.complexity || 'medium',
            priority: taskContext.priority || 'balanced',
            offlineMode: preferredProvider === 'ollama',
          });
          preferredModel = selection.model;
          preferredProvider = selection.provider;
        } catch {
          // Fall through to manual selection
        }
      }
    }

    // Try preferred provider first if circuit is closed
    if (preferredProvider && preferredProvider !== 'auto') {
      if (this.healthManager.isCircuitClosed(preferredProvider)) {
        try {
          const provider = AIProviderFactory.create(preferredProvider as any, providerConfig);
          const health = this.healthManager.getHealth(preferredProvider);
          return {
            provider,
            providerName: preferredProvider,
            model: preferredModel || 'default',
            usedFallback: false,
            health: health || { 
              name: preferredProvider, 
              available: true, 
              latencyMs: 0, 
              consecutiveFailures: 0,
              circuitOpen: false,
              circuitOpensAt: 3,
              circuitTimeoutMs: 300000,
              totalRequests: 0,
              successfulRequests: 0,
              averageLatencyMs: 0,
            },
          };
        } catch {
          // Preferred provider failed, will fallback
        }
      }
    }

    // Fallback: get best ranked provider
    if (this.config.enableFallback) {
      const ranked = this.healthManager.getRankedProviders(allProviders);
      
      for (const providerName of ranked) {
        if (providerName === preferredProvider) continue; // Already tried
        
        try {
          const provider = AIProviderFactory.create(providerName as any, providerConfig);
          const health = this.healthManager.getHealth(providerName);
          
          return {
            provider,
            providerName,
            model: preferredModel || 'default',
            usedFallback: true,
            fallbackFrom: preferredProvider,
            fallbackReason: preferredProvider 
              ? `${preferredProvider} unavailable (circuit open or failed)`
              : 'No preferred provider configured',
            health: health || {
              name: providerName,
              available: true,
              latencyMs: 0,
              consecutiveFailures: 0,
              circuitOpen: false,
              circuitOpensAt: 3,
              circuitTimeoutMs: 300000,
              totalRequests: 0,
              successfulRequests: 0,
              averageLatencyMs: 0,
            },
          };
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Execute a generation with automatic retry and fallback
   */
  async generate(
    prompt: string,
    options: {
      systemPrompt?: string;
      taskContext?: {
        taskType: 'commit_message' | 'code_documentation' | 'code_review' | 'refactoring' | 'general';
        complexity?: 'simple' | 'medium' | 'complex';
        priority?: 'speed' | 'quality' | 'balanced';
      };
      onFallback?: (from: string, to: string, reason: string) => void;
    } = {}
  ): Promise<{ result: string; provider: string; model: string; usedFallback: boolean }> {
    const { systemPrompt, taskContext, onFallback } = options;
    
    const fallbackResult = await this.getProvider(taskContext);
    if (!fallbackResult) {
      throw new Error('No AI providers available. Please configure at least one provider.');
    }

    const { provider, providerName, model, usedFallback, fallbackFrom, fallbackReason } = fallbackResult;

    if (usedFallback && onFallback && fallbackFrom) {
      onFallback(fallbackFrom, providerName, fallbackReason || 'Provider unavailable');
    }

    // Try with retries
    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await provider.generate(prompt, systemPrompt);
        const latency = Date.now() - startTime;
        
        // Record success
        this.healthManager.recordSuccess(providerName, latency);

        return {
          result,
          provider: providerName,
          model,
          usedFallback,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Record failure
        this.healthManager.recordFailure(providerName, lastError.message);
        
        if (attempt < this.config.maxRetries) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed after ${this.config.maxRetries + 1} attempts with ${providerName}: ${lastError?.message}`
    );
  }

  /**
   * Get health status for all providers
   */
  getProviderHealth(): ProviderHealth[] {
    return this.healthManager.getAllHealth();
  }

  /**
   * Force a health check refresh
   */
  async refreshHealth(): Promise<void> {
    await this.healthManager.checkAllHealth();
  }

  /**
   * Stop health polling
   */
  dispose(): void {
    this.healthManager.stopHealthPolling();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Convenience function for one-off generations with fallback
 */
export async function generateWithFallback(
  prompt: string,
  options?: {
    systemPrompt?: string;
    taskContext?: {
      taskType: 'commit_message' | 'code_documentation' | 'code_review' | 'refactoring' | 'general';
      complexity?: 'simple' | 'medium' | 'complex';
      priority?: 'speed' | 'quality' | 'balanced';
    };
    onFallback?: (from: string, to: string, reason: string) => void;
  }
): Promise<{ result: string; provider: string; model: string; usedFallback: boolean }> {
  const smartProvider = new SmartProvider();
  try {
    return await smartProvider.generate(prompt, options);
  } finally {
    // Don't dispose immediately to allow health polling to continue
    // Caller should manage lifecycle for long-running usage
  }
}

/**
 * Get singleton SmartProvider instance
 */
let globalSmartProvider: SmartProvider | null = null;

export function getGlobalSmartProvider(): SmartProvider {
  if (!globalSmartProvider) {
    globalSmartProvider = new SmartProvider();
  }
  return globalSmartProvider;
}

export function resetGlobalSmartProvider(): void {
  globalSmartProvider?.dispose();
  globalSmartProvider = null;
}
