import * as fs from 'fs';
import * as path from 'path';
import { GitOperations } from './git.js';
import { getAIProvider } from '../ai/providers.js';

export interface ReviewIssue {
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'bug' | 'security' | 'performance' | 'style' | 'best-practice' | 'documentation';
  message: string;
  suggestion?: string;
  code?: string;
}

export interface CodeReviewResult {
  issues: ReviewIssue[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  filesReviewed: number;
}

/**
 * Perform code review on staged changes
 */
export async function reviewStagedChanges(): Promise<CodeReviewResult> {
  const git = new GitOperations();
  const status = await git.getStatus();
  
  if (status.staged.length === 0) {
    return {
      issues: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      filesReviewed: 0,
    };
  }
  
  const issues: ReviewIssue[] = [];
  
  for (const file of status.staged) {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) continue;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileIssues = await reviewFile(filePath, content);
    issues.push(...fileIssues);
  }
  
  return {
    issues,
    summary: summarizeIssues(issues),
    filesReviewed: status.staged.length,
  };
}

/**
 * Review a single file
 */
export async function reviewFile(filePath: string, content: string): Promise<ReviewIssue[]> {
  const issues: ReviewIssue[] = [];
  const ext = path.extname(filePath).toLowerCase();
  
  // Language-specific static analysis
  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
    issues.push(...analyzeJavaScript(content, filePath));
  } else if (ext === '.py') {
    issues.push(...analyzePython(content, filePath));
  }
  
  // AI-powered review
  try {
    const ai = getAIProvider();
    if (ai) {
      const aiIssues = await reviewWithAI(filePath, content);
      issues.push(...aiIssues);
    }
  } catch {
    // AI review failed, continue with static analysis only
  }
  
  return issues;
}

/**
 * Static analysis for JavaScript/TypeScript
 */
function analyzeJavaScript(content: string, filePath: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = content.split('\n');
  const ext = path.extname(filePath).toLowerCase();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Check for console.log (should be removed in production)
    if (line.includes('console.log') && !line.includes('//')) {
      issues.push({
        file: filePath,
        line: lineNum,
        severity: 'low',
        type: 'best-practice',
        message: 'Console.log statement found - remove in production',
        code: line.trim(),
      });
    }
    
    // Check for TODO comments
    if (line.includes('TODO') || line.includes('FIXME')) {
      issues.push({
        file: filePath,
        line: lineNum,
        severity: 'info',
        type: 'documentation',
        message: 'TODO/FIXME comment found - consider creating an issue',
        code: line.trim(),
      });
    }
    
    // Check for empty catch blocks
    if (line.trim() === '}' && lines[i - 1]?.trim() === 'catch') {
      issues.push({
        file: filePath,
        line: lineNum,
        severity: 'medium',
        type: 'best-practice',
        message: 'Empty catch block - should handle errors',
        code: 'catch { }',
      });
    }
    
    // Check for var usage (prefer const/let)
    if (line.match(/\bvar\s+/)) {
      issues.push({
        file: filePath,
        line: lineNum,
        severity: 'low',
        type: 'style',
        message: 'Use const or let instead of var',
        code: line.trim(),
      });
    }
    
    // Check for any type (avoid in TypeScript)
    if (line.match(/\bany\b/) && (ext === '.ts' || ext === '.tsx')) {
      issues.push({
        file: filePath,
        line: lineNum,
        severity: 'medium',
        type: 'best-practice',
        message: 'Avoid using "any" type - use specific types',
        code: line.trim(),
      });
    }
  }
  
  return issues;
}

/**
 * Static analysis for Python
 */
function analyzePython(content: string, filePath: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Check for print statements
    if (line.includes('print(') && !line.includes('#')) {
      issues.push({
        file: filePath,
        line: lineNum,
        severity: 'low',
        type: 'best-practice',
        message: 'Print statement found - remove in production',
        code: line.trim(),
      });
    }
    
    // Check for bare except
    if (line.trim() === 'except:') {
      issues.push({
        file: filePath,
        line: lineNum,
        severity: 'high',
        type: 'best-practice',
        message: 'Bare except clause catches all exceptions - be specific',
        code: 'except:',
      });
    }
  }
  
  return issues;
}

/**
 * AI-powered code review
 */
async function reviewWithAI(filePath: string, content: string): Promise<ReviewIssue[]> {
  const ai = getAIProvider();
  if (!ai) return [];
  
  const prompt = `
Review this code for:
1. Bugs and logic errors
2. Security vulnerabilities
3. Performance issues
4. Code style and best practices
5. Missing documentation

File: ${filePath}

Code:
\`\`\`
${content.substring(0, 3000)}
\`\`\`

Respond with a JSON array of issues:
[
  {
    "line": 1,
    "severity": "critical|high|medium|low|info",
    "type": "bug|security|performance|style|best-practice|documentation",
    "message": "description",
    "suggestion": "how to fix"
  }
]`;
  
  try {
    const response = await ai.generate(prompt);
    const match = response.match(/\[[\s\S]*\]/);
    
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.map((issue: any) => ({
        file: filePath,
        line: issue.line,
        severity: issue.severity,
        type: issue.type,
        message: issue.message,
        suggestion: issue.suggestion,
      }));
    }
  } catch {
    // AI review failed
  }
  
  return [];
}

/**
 * Summarize issues by severity
 */
function summarizeIssues(issues: ReviewIssue[]) {
  return {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
    info: issues.filter(i => i.severity === 'info').length,
  };
}

/**
 * Format review results for display
 */
export function formatReviewResult(result: CodeReviewResult): string {
  let output = `Code Review Results\n`;
  output += '='.repeat(60) + '\n\n';
  output += `Files reviewed: ${result.filesReviewed}\n`;
  output += `Total issues: ${result.summary.total}\n`;
  output += `  Critical: ${result.summary.critical}\n`;
  output += `  High: ${result.summary.high}\n`;
  output += `  Medium: ${result.summary.medium}\n`;
  output += `  Low: ${result.summary.low}\n`;
  output += `  Info: ${result.summary.info}\n\n`;
  
  if (result.issues.length > 0) {
    output += 'Issues:\n';
    output += '-'.repeat(60) + '\n';
    
    for (const issue of result.issues) {
      const severityIcon = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        info: '🔵',
      }[issue.severity];
      
      output += `\n${severityIcon} [${issue.type.toUpperCase()}] ${issue.file}:${issue.line || '?'}\n`;
      output += `   ${issue.message}\n`;
      
      if (issue.suggestion) {
        output += `   💡 ${issue.suggestion}\n`;
      }
      
      if (issue.code) {
        output += `   Code: ${issue.code}\n`;
      }
    }
  } else {
    output += '✅ No issues found!\n';
  }
  
  return output;
}

export default {
  reviewStagedChanges,
  reviewFile,
  formatReviewResult,
};
