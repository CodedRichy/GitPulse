import { AIProviderFactory } from './providers.js';

const AVAILABLE_MODELS = {
  openrouter: [
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'OR Nemotron 120B', strengths: ['code_gen', 'reasoning', 'tools'], speed: 'fast' },
    { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'OR Nemotron Nano 30B', strengths: ['code_gen', 'reasoning', 'tools'], speed: 'fast' },
    { id: 'google/gemma-4-31b-it:free', name: 'OR Gemma 4 31B', strengths: ['speed', 'simple_tasks'], speed: 'very_fast' }
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Groq 3.3-70B', strengths: ['quality', 'complex_tasks'], speed: 'fast', tpm: 6000 },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Groq 4-Scout', strengths: ['quality', 'complex_tasks'], speed: 'fast', tpm: 6000 },
    { id: 'llama-3.1-8b-instant', name: 'Groq 3.1-8B', strengths: ['speed', 'high_volume'], speed: 'very_fast', tpm: 30000 }
  ],
  google: [
    { id: 'gemini-3.1-flash-lite-preview', name: 'Google Gemini', strengths: ['speed', 'quality', 'generous_limits'], speed: 'medium' }
  ]
};

interface TaskContext {
  taskType: 'commit_message' | 'code_documentation' | 'code_review' | 'refactoring' | 'general';
  complexity: 'simple' | 'medium' | 'complex';
  priority: 'speed' | 'quality' | 'balanced';
  inputLength?: number;
  offlineMode?: boolean;
}

/**
 * Auto-select the best model based on task context
 * Uses a lightweight model (Google Gemini) to make the decision
 */
export async function autoSelectModel(context: TaskContext): Promise<{ model: string; provider: string; reasoning: string }> {
  const { taskType, complexity, priority, inputLength, offlineMode } = context;
  
  // If offline mode, check for Ollama
  if (offlineMode) {
    try {
      const ollamaProvider = AIProviderFactory.create('ollama', {
        ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
        model: ''
      }) as any;
      
      const models = await ollamaProvider.listModels();
      if (models && models.length > 0) {
        return {
          model: models[0],
          provider: 'ollama',
          reasoning: 'Offline mode - using local Ollama model'
        };
      }
    } catch {
      // Ollama not available, continue with cloud models
    }
  }
  
  // Simple heuristic-based selection (fallback)
  return heuristicSelectModel(context);
}

/**
 * Heuristic-based model selection without AI
 */
function heuristicSelectModel(context: TaskContext): { model: string; provider: string; reasoning: string } {
  const { taskType, complexity, priority } = context;
  
  // Task-specific defaults
  const taskPreferences = {
    commit_message: { priority: 'speed', preferred: 'llama-3.1-8b-instant', provider: 'groq' },
    code_documentation: { priority: 'balanced', preferred: 'llama-3.3-70b-versatile', provider: 'groq' },
    code_review: { priority: 'quality', preferred: 'llama-3.3-70b-versatile', provider: 'groq' },
    refactoring: { priority: 'quality', preferred: 'llama-3.3-70b-versatile', provider: 'groq' },
    general: { priority: 'balanced', preferred: 'gemini-3.1-flash-lite-preview', provider: 'google' }
  };
  
  const taskPref = taskPreferences[taskType];
  
  // Override based on user priority
  if (priority === 'speed') {
    if (taskType === 'general') {
      return {
        model: 'google/gemma-4-31b-it:free',
        provider: 'openrouter',
        reasoning: 'Speed priority - using fastest OpenRouter model'
      };
    }
    return {
      model: 'llama-3.1-8b-instant',
      provider: 'groq',
      reasoning: 'Speed priority - using fastest Groq model'
    };
  }
  
  if (priority === 'quality') {
    return {
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      reasoning: 'Quality priority - using highest quality Groq model'
    };
  }
  
  // Balanced - use task preference
  if (taskPref.provider === 'groq' && process.env.GROQ_API_KEY) {
    return {
      model: taskPref.preferred,
      provider: 'groq',
      reasoning: `Balanced - using Groq ${taskPref.preferred} for ${taskType}`
    };
  }
  
  if (taskPref.provider === 'google' && process.env.GOOGLE_API_KEY) {
    return {
      model: taskPref.preferred,
      provider: 'google',
      reasoning: `Balanced - using Google ${taskPref.preferred} for ${taskType}`
    };
  }
  
  // Fallback to OpenRouter
  return {
    model: 'google/gemma-4-31b-it:free',
    provider: 'openrouter',
    reasoning: 'Fallback - using OpenRouter Gemma model'
  };
}

/**
 * Get available models from all providers
 */
export async function getAvailableModels(): Promise<{ provider: string; models: string[] }[]> {
  const available = [];
  
  // OpenRouter models
  available.push({
    provider: 'openrouter',
    models: AVAILABLE_MODELS.openrouter.map(m => m.id)
  });
  
  // Groq models
  if (process.env.GROQ_API_KEY) {
    available.push({
      provider: 'groq',
      models: AVAILABLE_MODELS.groq.map(m => m.id)
    });
  }
  
  // Google models
  if (process.env.GOOGLE_API_KEY) {
    available.push({
      provider: 'google',
      models: AVAILABLE_MODELS.google.map(m => m.id)
    });
  }
  
  // Ollama models
  try {
    const ollamaProvider = AIProviderFactory.create('ollama', {
      ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
      model: ''
    }) as any;
    
    const models = await ollamaProvider.listModels();
    if (models && models.length > 0) {
      available.push({
        provider: 'ollama',
        models
      });
    }
  } catch {
    // Ollama not available
  }
  
  return available;
}
