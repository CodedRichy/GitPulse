import { GitOperations } from './git.js';
import { getAIProvider } from '../ai/providers.js';

export interface BranchSuggestion {
  name: string;
  type: 'feature' | 'fix' | 'hotfix' | 'refactor' | 'docs' | 'test' | 'chore';
  description: string;
  confidence: number;
  relatedIssues?: string[];
}

export interface BranchAnalysis {
  currentBranch: string;
  baseBranch: string;
  ahead: number;
  behind: number;
  hasUncommitted: boolean;
  suggestion?: BranchSuggestion;
}

/**
 * Analyze current branch and provide intelligent suggestions
 */
export async function analyzeBranch(): Promise<BranchAnalysis> {
  const git = new GitOperations();
  
  const status = await git.getStatus();
  const currentBranch = status.branch;
  const baseBranch = 'main'; // Could be configurable
  
  return {
    currentBranch,
    baseBranch,
    ahead: status.ahead,
    behind: status.behind,
    hasUncommitted: status.staged.length > 0 || status.unstaged.length > 0,
  };
}

/**
 * Generate branch name suggestions based on context
 */
export async function generateBranchSuggestion(context: {
  currentBranch?: string;
  changes?: string[];
  description?: string;
}): Promise<BranchSuggestion[]> {
  const suggestions: BranchSuggestion[] = [];
  
  // Extract keywords from description or changes
  const keywords = extractKeywords(context.description || context.changes?.join(' ') || '');
  
  // Generate suggestions based on common patterns
  const patterns = [
    { type: 'feature' as const, prefix: 'feat' },
    { type: 'fix' as const, prefix: 'fix' },
    { type: 'hotfix' as const, prefix: 'hotfix' },
    { type: 'refactor' as const, prefix: 'refactor' },
    { type: 'docs' as const, prefix: 'docs' },
    { type: 'test' as const, prefix: 'test' },
    { type: 'chore' as const, prefix: 'chore' },
  ];
  
  for (const pattern of patterns) {
    const name = `${pattern.prefix}/${keywords.slice(0, 3).join('-') || 'update'}`;
    suggestions.push({
      name,
      type: pattern.type,
      description: generateDescription(pattern.type, keywords),
      confidence: calculateConfidence(pattern.type, keywords, context.description),
    });
  }
  
  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  return suggestions.slice(0, 5);
}

/**
 * Use AI to generate intelligent branch suggestions
 */
export async function generateAIBranchSuggestions(context: {
  changes: string[];
  description?: string;
}): Promise<BranchSuggestion[]> {
  try {
    const ai = getAIProvider();
    if (!ai) {
      return generateBranchSuggestion(context);
    }
    
    const prompt = `
Based on these git changes, suggest 3-5 branch names following conventional branch naming patterns (feature/, fix/, hotfix/, refactor/, docs/, test/, chore/).

Changes:
${context.changes.map(f => `- ${f}`).join('\n')}

${context.description ? `Description: ${context.description}` : ''}

Respond with a JSON array:
[
  {
    "name": "branch-name",
    "type": "feature|fix|hotfix|refactor|docs|test|chore",
    "description": "brief description",
    "confidence": 0.95
  }
]`;
    
    const response = await ai.generate(prompt);
    const match = response.match(/\[[\s\S]*\]/);

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (!Array.isArray(parsed)) {
          throw new Error('AI response is not an array');
        }
        return parsed.map((s: any) => ({
          name: s.name || 'unknown',
          type: s.type || 'feature',
          description: s.description || '',
          confidence: typeof s.confidence === 'number' ? s.confidence : 0.8,
        })).filter((s: BranchSuggestion) => s.name && s.type);
      } catch (error) {
        console.warn('Failed to parse AI response:', error);
      }
    }
  } catch (error) {
    console.warn('AI generation failed:', error);
    // Fallback to pattern-based suggestions
  }

  return generateBranchSuggestion(context);
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'been', 'will'].includes(w));
  
  // Remove duplicates
  return [...new Set(words)];
}

/**
 * Generate description for branch type
 */
function generateDescription(type: string, keywords: string[]): string {
  const keyword = keywords[0] || 'update';
  const descriptions: Record<string, string> = {
    feature: `Add new ${keyword} functionality`,
    fix: `Fix ${keyword} issue`,
    hotfix: `Hotfix for ${keyword}`,
    refactor: `Refactor ${keyword} code`,
    docs: `Update ${keyword} documentation`,
    test: `Add ${keyword} tests`,
    chore: `Chore: ${keyword} maintenance`,
  };
  
  return descriptions[type] || `Update ${keyword}`;
}

/**
 * Calculate confidence score for suggestion
 */
function calculateConfidence(type: string, keywords: string[], description?: string): number {
  let confidence = 0.7; // Base confidence
  
  // Boost if keywords match type
  const typeKeywords: Record<string, string[]> = {
    feature: ['add', 'new', 'implement', 'create'],
    fix: ['fix', 'bug', 'issue', 'error'],
    hotfix: ['urgent', 'critical', 'hotfix'],
    refactor: ['refactor', 'clean', 'improve', 'optimize'],
    docs: ['doc', 'readme', 'guide', 'documentation'],
    test: ['test', 'spec', 'coverage'],
    chore: ['chore', 'maintenance', 'update', 'upgrade'],
  };
  
  for (const keyword of keywords) {
    if (typeKeywords[type]?.includes(keyword)) {
      confidence += 0.1;
    }
  }
  
  // Boost if description is provided
  if (description) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 0.99);
}

export default {
  analyzeBranch,
  generateBranchSuggestion,
  generateAIBranchSuggestions,
};
