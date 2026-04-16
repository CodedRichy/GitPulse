import { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

export const analyzeFileTool: Tool = {
  name: 'analyze_file',
  description: 'Analyze a single file for complexity, documentation coverage, exports, imports, and function signatures. Useful for understanding file structure before making changes.',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description: 'Path to the file to analyze (relative to repo root or absolute)',
      },
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
    },
    required: ['file'],
  },
};

export async function handleAnalyzeFile(args: Record<string, unknown>) {
  const repoPath = (args?.path as string) || '.';
  const filePath = args?.file as string;

  if (!filePath) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ error: 'File path is required' }),
      }],
    };
  }

  const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(repoPath, filePath);

  if (!fs.existsSync(fullPath)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ error: `File not found: ${filePath}` }),
      }],
    };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const ext = path.extname(fullPath).toLowerCase();
  const lines = content.split('\n');

  const analysis: Record<string, unknown> = {
    file: filePath,
    language: detectLanguage(ext),
    totalLines: lines.length,
    blankLines: lines.filter(l => l.trim() === '').length,
    commentLines: countCommentLines(lines, ext),
  };

  // Code-specific analysis
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    analysis.exports = extractExports(content);
    analysis.imports = extractImports(content);
    analysis.functions = extractFunctions(content);
    analysis.classes = extractClasses(content);
    analysis.complexity = assessComplexity(content, lines.length);

    // Documentation coverage
    const exportedItems = (analysis.exports as string[]).length;
    const documentedExports = countDocumentedExports(content);
    analysis.documentationCoverage = exportedItems > 0
      ? Math.round((documentedExports / exportedItems) * 100)
      : 100;
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(analysis, null, 2),
    }],
  };
}

function detectLanguage(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript (JSX)', '.js': 'JavaScript',
    '.jsx': 'JavaScript (JSX)', '.py': 'Python', '.rs': 'Rust',
    '.go': 'Go', '.java': 'Java', '.rb': 'Ruby', '.css': 'CSS',
    '.html': 'HTML', '.json': 'JSON', '.md': 'Markdown', '.yml': 'YAML',
    '.yaml': 'YAML', '.sh': 'Shell', '.sql': 'SQL',
  };
  return map[ext] || 'Unknown';
}

function countCommentLines(lines: string[], ext: string): number {
  let count = 0;
  let inBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (['.ts', '.tsx', '.js', '.jsx', '.java', '.go', '.rs'].includes(ext)) {
      if (trimmed.startsWith('/*')) inBlock = true;
      if (inBlock) { count++; if (trimmed.includes('*/')) inBlock = false; continue; }
      if (trimmed.startsWith('//')) count++;
    } else if (ext === '.py') {
      if (trimmed.startsWith('#')) count++;
    }
  }
  return count;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const patterns = [
    /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g,
    /export\s+\{\s*([^}]+)\s*\}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop()!.trim());
      exports.push(...names.filter(n => n.length > 0));
    }
  }
  return [...new Set(exports)];
}

function extractImports(content: string): { source: string; specifiers: string[] }[] {
  const imports: { source: string; specifiers: string[] }[] = [];
  const pattern = /import\s+(?:(?:\{([^}]+)\}|(\w+))\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const specifiers = match[1]
      ? match[1].split(',').map(s => s.trim().split(/\s+as\s+/).shift()!.trim())
      : match[2] ? [match[2]] : [];
    imports.push({ source: match[3], specifiers });
  }
  return imports;
}

function extractFunctions(content: string): { name: string; params: number; hasJSDoc: boolean; line: number }[] {
  const functions: { name: string; params: number; hasJSDoc: boolean; line: number }[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
    if (match) {
      const hasJSDoc = i > 0 && lines.slice(Math.max(0, i - 5), i).some(l => l.trim().startsWith('/**'));
      const params = match[2].trim() ? match[2].split(',').length : 0;
      functions.push({ name: match[1], params, hasJSDoc, line: i + 1 });
    }
  }
  return functions;
}

function extractClasses(content: string): { name: string; line: number }[] {
  const classes: { name: string; line: number }[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/(?:export\s+)?class\s+(\w+)/);
    if (match) {
      classes.push({ name: match[1], line: i + 1 });
    }
  }
  return classes;
}

function assessComplexity(content: string, lineCount: number): { level: string; score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0;

  if (lineCount > 500) { score += 3; factors.push(`Large file (${lineCount} lines)`); }
  else if (lineCount > 300) { score += 2; factors.push(`Medium file (${lineCount} lines)`); }
  else { score += 1; }

  const nestingDepth = (content.match(/\{/g) || []).length;
  if (nestingDepth > 50) { score += 2; factors.push('High nesting'); }

  const conditionals = (content.match(/\b(if|else|switch|case|\?)\b/g) || []).length;
  if (conditionals > 30) { score += 2; factors.push(`Many conditionals (${conditionals})`); }

  const callbacks = (content.match(/=>/g) || []).length;
  if (callbacks > 20) { score += 1; factors.push(`Many callbacks (${callbacks})`); }

  return {
    level: score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low',
    score: Math.min(10, score),
    factors: factors.length > 0 ? factors : ['Simple structure'],
  };
}

function countDocumentedExports(content: string): number {
  const lines = content.split('\n');
  let documented = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^export\s+(?:default\s+)?(?:function|class|const|interface|type)/)) {
      const prev = lines.slice(Math.max(0, i - 5), i).join('\n');
      if (prev.includes('/**')) documented++;
    }
  }
  return documented;
}
