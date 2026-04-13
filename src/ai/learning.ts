import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LEARNING_DIR = path.join(os.homedir(), '.gitpulse');
const LEARNING_FILE = path.join(LEARNING_DIR, 'learning.json');

export interface LearningData {
  commitPatterns: {
    type: string;
    scope?: string;
    count: number;
  }[];
  branchPatterns: string[];
  preferredStyle: 'conventional' | 'semantic' | 'simple';
  commonPrefixes: string[];
  userCorrections: {
    original: string;
    corrected: string;
    timestamp: number;
  }[];
}

/**
 * Load learning data from file
 */
export function loadLearning(): LearningData {
  try {
    if (fs.existsSync(LEARNING_FILE)) {
      const content = fs.readFileSync(LEARNING_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('Failed to load learning data:', error);
  }
  
  return {
    commitPatterns: [],
    branchPatterns: [],
    preferredStyle: 'conventional',
    commonPrefixes: [],
    userCorrections: []
  };
}

/**
 * Save learning data to file
 */
export function saveLearning(data: LearningData): void {
  try {
    if (!fs.existsSync(LEARNING_DIR)) {
      fs.mkdirSync(LEARNING_DIR, { recursive: true });
    }
    fs.writeFileSync(LEARNING_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('Failed to save learning data:', error);
  }
}

/**
 * Record a user correction
 */
export function recordCorrection(original: string, corrected: string): void {
  const learning = loadLearning();
  
  learning.userCorrections.push({
    original,
    corrected,
    timestamp: Date.now()
  });
  
  // Keep only last 100 corrections
  if (learning.userCorrections.length > 100) {
    learning.userCorrections = learning.userCorrections.slice(-100);
  }
  
  // Analyze patterns from corrections
  analyzeCommitPattern(corrected, learning);
  
  saveLearning(learning);
}

/**
 * Analyze commit message pattern
 */
function analyzeCommitPattern(message: string, learning: LearningData): void {
  // Check for conventional commit pattern
  const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
  if (conventionalMatch) {
    const [, type, scope] = conventionalMatch;
    
    const existing = learning.commitPatterns.find(p => p.type === type && p.scope === scope);
    if (existing) {
      existing.count++;
    } else {
      learning.commitPatterns.push({ type, scope, count: 1 });
    }
  }
}

/**
 * Record a branch name pattern
 */
export function recordBranchPattern(branch: string): void {
  const learning = loadLearning();
  
  if (!learning.branchPatterns.includes(branch)) {
    learning.branchPatterns.push(branch);
    // Keep only last 20 branch patterns
    if (learning.branchPatterns.length > 20) {
      learning.branchPatterns = learning.branchPatterns.slice(-20);
    }
    saveLearning(learning);
  }
}

/**
 * Get learning summary
 */
export function getLearningSummary(): {
  totalCorrections: number;
  topPatterns: { type: string; count: number }[];
  preferredStyle: string;
} {
  const learning = loadLearning();
  
  // Aggregate patterns by type
  const patternCounts: Record<string, number> = {};
  learning.commitPatterns.forEach(p => {
    const key = p.scope ? `${p.type}(${p.scope})` : p.type;
    patternCounts[key] = (patternCounts[key] || 0) + p.count;
  });
  
  const topPatterns = Object.entries(patternCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    totalCorrections: learning.userCorrections.length,
    topPatterns,
    preferredStyle: learning.preferredStyle
  };
}

/**
 * Generate enhanced prompt based on learning
 */
export function generateLearnedPrompt(basePrompt: string, learning: LearningData): string {
  let enhanced = basePrompt;
  
  // Add style guidance based on patterns
  if (learning.commitPatterns.length > 0) {
    const topPattern = learning.commitPatterns[0];
    enhanced += `\n\nPreferred commit style: Use ${topPattern.type}${topPattern.scope ? `(${topPattern.scope})` : ''} pattern`;
  }
  
  // Add recent corrections as examples
  if (learning.userCorrections.length > 0) {
    const recentCorrections = learning.userCorrections.slice(-3);
    enhanced += '\n\nRecent user corrections for reference:';
    recentCorrections.forEach(c => {
      enhanced += `\n  - "${c.original}" → "${c.corrected}"`;
    });
  }
  
  return enhanced;
}

export default {
  loadLearning,
  saveLearning,
  recordCorrection,
  recordBranchPattern,
  getLearningSummary,
  generateLearnedPrompt
};
