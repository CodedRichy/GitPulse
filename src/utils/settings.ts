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
 * Load user settings from ~/.gitpulse/settings.json
 */
export function loadSettings(): Settings {
  try {
    if (fs.existsSync(USER_SETTINGS_FILE)) {
      const content = fs.readFileSync(USER_SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Ignore errors, return empty settings
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
