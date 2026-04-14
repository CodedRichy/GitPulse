import * as fs from 'fs';
import * as path from 'path';
import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { GitOperations } from '../core/git.js';
import { getAIProvider } from '../ai/providers.js';
import { reviewStagedChanges, reviewFile as reviewFileWithModule, formatReviewResult } from '../core/code-review.js';

interface ReviewComment {
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'error' | 'suggestion';
  message: string;
  code?: string;
  suggestion?: string;
}

interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
  stats: {
    filesReviewed: number;
    issuesFound: number;
    suggestions: number;
  };
}

async function getChangedFiles(
  gitOps: GitOperations,
  target: 'staged' | 'unstaged' | 'last-commit' | string
): Promise<string[]> {
  const { simpleGit } = await import('simple-git');
  const git = simpleGit();
  const repoRoot = await gitOps.getRepoRoot();

  if (target === 'staged') {
    const status = await gitOps.getStatus();
    return status.staged;
  }

  if (target === 'unstaged') {
    const status = await gitOps.getStatus();
    return [...status.unstaged, ...status.untracked];
  }

  if (target === 'last-commit') {
    const diff = await git.diff(['HEAD~1', 'HEAD', '--name-only']);
    return diff.split('\n').filter(f => f.trim());
  }

  if (fs.existsSync(path.join(repoRoot, target))) {
    return [target];
  }

  return [];
}

async function reviewFile(
  filePath: string,
  content: string,
  language: string
): Promise<ReviewComment[]> {
  const ai = getAIProvider();
  if (!ai) {
    throw new Error('No AI provider configured');
  }

  const prompt = `
Review this ${language} code file and provide constructive feedback. Focus on:
1. Code quality and best practices
2. Potential bugs or issues
3. Security concerns
4. Performance improvements
5. Readability and maintainability

Format your response as a JSON array of comments:
[
  {
    "line": <line_number>,
    "severity": "info|warning|error|suggestion",
    "message": "Your comment here",
    "suggestion": "Suggested improvement (optional)"
  }
]

If no issues found, return an empty array: []

Code to review:
\`\`\`${language}
${content}
\`\`\`
`;

  try {
    const response = await ai.generate(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const comments = JSON.parse(jsonMatch[0]);
      return comments.map((c: Omit<ReviewComment, 'file'>) => ({
        ...c,
        file: filePath,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const languages: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
  };
  return languages[ext] || 'code';
}

async function reviewHandler(context: CommandContext): Promise<CommandResult> {
  const gitOps = new GitOperations();
  const isRepo = await gitOps.isRepo();

  if (!isRepo) {
    return {
      success: false,
      error: 'Not a git repository.',
    };
  }

  const target = (context.args[0] as 'staged' | 'unstaged' | 'last-commit') || 'staged';
  const validTargets = ['staged', 'unstaged', 'last-commit'];

  try {
    // Use the new code-review module for staged changes
    if (target === 'staged') {
      const result = await reviewStagedChanges();
      return {
        success: true,
        message: formatReviewResult(result),
        data: result,
      };
    }

    // For other targets, use the old implementation
    const repoRoot = await gitOps.getRepoRoot();
    const files = await getChangedFiles(gitOps, target);

    if (files.length === 0) {
      return {
        success: true,
        message: `No files to review for target: ${target}`,
      };
    }

    const allComments: ReviewComment[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const filePath = path.join(repoRoot, file);

      if (!fs.existsSync(filePath)) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const language = detectLanguage(file);

      try {
        const moduleResult = await reviewFileWithModule(filePath, content);
        // Convert module result to ReviewComment format
        const comments = moduleResult.map(m => ({
          file: m.file,
          line: m.line || 0,
          severity: m.severity as 'info' | 'warning' | 'error' | 'suggestion',
          message: m.message,
          code: m.code,
          suggestion: m.suggestion,
        }));
        allComments.push(...comments);
      } catch (error) {
        errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const stats = {
      filesReviewed: files.length,
      issuesFound: allComments.filter(c => c.severity === 'error' || c.severity === 'warning').length,
      suggestions: allComments.filter(c => c.severity === 'suggestion').length,
    };

    const summary = `Reviewed ${files.length} file(s): ${stats.issuesFound} issues, ${stats.suggestions} suggestions`;

    const formattedComments = allComments
      .map(c => `[${c.severity.toUpperCase()}] ${c.file}:${c.line} - ${c.message}${c.suggestion ? `\n  Suggestion: ${c.suggestion}` : ''}`)
      .join('\n\n');

    return {
      success: errors.length === 0,
      message: `${summary}\n\n${formattedComments}`,
      data: {
        summary,
        comments: allComments,
        stats,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Review failed',
    };
  }
}

export const reviewCommand: CommandRegistration = {
  name: 'review',
  description: 'Code review with AI suggestions for staged/unstaged/last-commit changes',
  handler: reviewHandler,
  aliases: ['cr', 'code-review'],
};
