import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const USER_SETTINGS_DIR = path.join(os.homedir(), '.gitpulse');
const USER_SETTINGS_FILE = path.join(USER_SETTINGS_DIR, 'settings.json');

interface Settings {
  model?: string;
  [key: string]: any;
}

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
 * Load user settings from ~/.gitpulse/settings.json
 */
export function loadSettings(): Settings {
  try {
    if (fs.existsSync(USER_SETTINGS_FILE)) {
      const content = fs.readFileSync(USER_SETTINGS_FILE, 'utf-8');
      return safeJSONParse<Settings>(content, {});
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return {};
}

/**
 * Save user settings to ~/.gitpulse/settings.json
 */
export function saveSettings(settings: Settings): void {
  try {
    if (!fs.existsSync(USER_SETTINGS_DIR)) {
      fs.mkdirSync(USER_SETTINGS_DIR, { recursive: true });
    }
    fs.writeFileSync(USER_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Get a specific setting value
 */
export function getSetting<T>(key: string, defaultValue: T): T {
  const settings = loadSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Set a specific setting value
 */
export function setSetting(key: string, value: any): void {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
}

export default {
  loadSettings,
  saveSettings,
  getSetting,
  setSetting
};
