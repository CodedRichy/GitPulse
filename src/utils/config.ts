import { Config } from '../core/models.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import 'dotenv/config';
import { getSetting as getSettingsSetting } from './settings.js';

export const CONFIG_DIR = path.join(os.homedir(), '.gitpulse');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Model aliases for quick selection
 */
export const MODEL_ALIASES: Record<string, string> = {
  'auto': '',
  'nvidia/nemotron-3-super-120b-a12b:free': 'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free': 'nvidia/nemotron-3-nano-30b-a3b:free',
  'google/gemma-4-31b-it:free': 'google/gemma-4-31b-it:free',
  'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant': 'llama-3.1-8b-instant',
  'gemini-3.1-flash-lite-preview': 'gemini-3.1-flash-lite-preview'
};

/**
 * Default configuration
 */
const defaultConfig: Config = {
  aiProvider: 'auto' as const,
  commitStyle: 'conventional',
  autoCommit: false,
  ollamaHost: 'http://localhost:11434',
  ollamaModel: 'llama3.2'
};

/**
 * Safe JSON parse with error handling
 */
function safeJSONParse<T = unknown>(content: string, fallback: T): T {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    return fallback;
  }
}

/**
 * Load configuration from file and environment
 */
export function loadConfig(): Config {
  let fileConfig: Partial<Config> = {};
  
  // Load from config file if exists
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      fileConfig = safeJSONParse<Partial<Config>>(content, {});
    } catch (error) {
      console.warn('Failed to load config file:', error);
    }
  }

  // Environment variables override file config
  const envConfig: Partial<Config> = {};
  
  if (process.env.AI_PROVIDER) {
    envConfig.aiProvider = process.env.AI_PROVIDER as Config['aiProvider'];
  }
  if (process.env.COMMIT_STYLE) {
    envConfig.commitStyle = process.env.COMMIT_STYLE as Config['commitStyle'];
  }
  if (process.env.AUTO_COMMIT) {
    envConfig.autoCommit = process.env.AUTO_COMMIT === 'true';
  }
  if (process.env.OPENROUTER_API_KEY) {
    envConfig.openrouterApiKey = process.env.OPENROUTER_API_KEY;
  }
  if (process.env.OLLAMA_HOST) {
    envConfig.ollamaHost = process.env.OLLAMA_HOST;
  }
  if (process.env.OLLAMA_MODEL) {
    envConfig.ollamaModel = process.env.OLLAMA_MODEL;
  }

  return {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig
  };
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Partial<Config>): void {
  // Ensure config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...config };
  
  // Use atomic write pattern: write to temp file, then rename
  const tempFile = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(newConfig, null, 2));
  fs.renameSync(tempFile, CONFIG_FILE);
}

/**
 * Get a specific config value
 */
export function getConfig<K extends keyof Config>(key: K): Config[K] {
  const config = loadConfig();
  return config[key];
}

/**
 * Set a specific config value
 */
export function setConfig<K extends keyof Config>(key: K, value: Config[K]): void {
  saveConfig({ [key]: value } as Partial<Config>);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

/**
 * Show current configuration
 */
export function showConfig(): Config {
  return loadConfig();
}

/**
 * Get AI provider configuration
 */
export function getAIProviderConfig(): {
  openrouterApiKey?: string;
  ollamaHost?: string;
  ollamaModel?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
  groqApiKey?: string;
  model?: string;
} {
  const config = loadConfig();
  const modelAlias = getSettingsSetting('model', 'default');
  return {
    openrouterApiKey: config.openrouterApiKey,
    ollamaHost: config.ollamaHost,
    ollamaModel: config.ollamaModel,
    openaiApiKey: config.openaiApiKey,
    googleApiKey: config.googleApiKey,
    groqApiKey: config.groqApiKey,
    model: resolveModel(modelAlias)
  };
}

/**
 * Resolve model alias to actual model ID
 */
export function resolveModel(model?: string): string {
  if (!model) {
    return MODEL_ALIASES['auto'];
  }
  // If it's an alias, return the resolved model
  if (MODEL_ALIASES[model]) {
    return MODEL_ALIASES[model];
  }
  // Otherwise, return it as-is (custom model ID)
  return model;
}

export default {
  loadConfig,
  saveConfig,
  getConfig,
  setConfig,
  resetConfig,
  showConfig,
  getAIProviderConfig,
  MODEL_ALIASES,
  resolveModel
};
