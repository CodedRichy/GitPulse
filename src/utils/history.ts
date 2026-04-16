import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const HISTORY_DIR = path.join(os.homedir(), '.gitpulse');
const HISTORY_FILE = path.join(HISTORY_DIR, 'history.json');

export interface CommitHistoryEntry {
  hash: string;
  message: string;
  aiSuggestion: string;
  userEdited: boolean;
  timestamp: number;
  branch: string;
  files: string[];
}

export interface HistoryData {
  commits: CommitHistoryEntry[];
  maxSize: number;
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
 * Load commit history from file
 */
export function loadHistory(): HistoryData {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return safeJSONParse<HistoryData>(content, { commits: [], maxSize: 50 });
    }
  } catch (error) {
    console.warn('Failed to load history:', error);
  }
  
  return { commits: [], maxSize: 50 };
}

/**
 * Save commit history to file
 */
export function saveHistory(history: HistoryData): void {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.warn('Failed to save history:', error);
  }
}

/**
 * Add a commit to history
 */
export function addCommitToHistory(entry: CommitHistoryEntry): void {
  const history = loadHistory();
  history.commits.unshift(entry);
  
  // Limit history size
  if (history.commits.length > history.maxSize) {
    history.commits = history.commits.slice(0, history.maxSize);
  }
  
  saveHistory(history);
}

/**
 * Get the last commit from history
 */
export function getLastCommit(): CommitHistoryEntry | null {
  const history = loadHistory();
  return history.commits[0] || null;
}

/**
 * Get history for a specific commit hash
 */
export function getCommitByHash(hash: string): CommitHistoryEntry | null {
  const history = loadHistory();
  return history.commits.find(c => c.hash === hash) || null;
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  saveHistory({ commits: [], maxSize: 50 });
}

/**
 * Get history statistics
 */
export function getHistoryStats(): { total: number; edited: number; aiGenerated: number } {
  const history = loadHistory();
  const edited = history.commits.filter(c => c.userEdited).length;
  return {
    total: history.commits.length,
    edited,
    aiGenerated: history.commits.length - edited
  };
}

export default {
  loadHistory,
  saveHistory,
  addCommitToHistory,
  getLastCommit,
  getCommitByHash,
  clearHistory,
  getHistoryStats
};
