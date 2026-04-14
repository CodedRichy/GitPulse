import * as fs from 'fs';
import * as path from 'path';
import { GitOperations } from '../core/git.js';

export interface FileContext {
  path: string;
  content: string;
  language: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface ContextOptions {
  maxFiles?: number;
  maxContextSize?: number;
  includeImports?: boolean;
  includeRelated?: boolean;
}

/**
 * Gather multi-file context for AI generation
 */
export async function gatherContext(
  diff: string,
  options: ContextOptions = {}
): Promise<FileContext[]> {
  const {
    maxFiles = 5,
    maxContextSize = 10000,
    includeImports = true,
    includeRelated = true
  } = options;

  const git = new GitOperations();
  const context: FileContext[] = [];

  // Extract changed files from diff
  const changedFiles = extractFilesFromDiff(diff);
  
  if (changedFiles.length === 0) {
    return context;
  }

  // Add changed files to context
  for (const filePath of changedFiles) {
    if (context.length >= maxFiles) break;
    
    try {
      const fullPath = path.resolve(filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const language = detectLanguage(filePath);
        
        context.push({
          path: filePath,
          content: truncateContent(content, maxContextSize / maxFiles),
          language,
          relevance: 'high'
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Add import-related files if enabled
  if (includeImports && context.length < maxFiles) {
    const importFiles = await findImportFiles(context, maxFiles - context.length);
    context.push(...importFiles);
  }

  // Add related files (same directory) if enabled
  if (includeRelated && context.length < maxFiles) {
    const relatedFiles = await findRelatedFiles(context, maxFiles - context.length);
    context.push(...relatedFiles);
  }

  return context;
}

/**
 * Extract file paths from git diff
 */
function extractFilesFromDiff(diff: string): string[] {
  const files: string[] = [];
  const lines = diff.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^a\/(.+)|^b\/(.+)/);
    if (match) {
      const filePath = match[1] || match[2];
      if (filePath && !files.includes(filePath)) {
        files.push(filePath);
      }
    }
  }
  
  return files;
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  const languageMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.rs': 'Rust',
    '.go': 'Go',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C',
    '.hpp': 'C++',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.dart': 'Dart',
    '.scala': 'Scala',
    '.sh': 'Shell',
    '.bash': 'Shell',
    '.zsh': 'Shell',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.xml': 'XML',
    '.md': 'Markdown',
    '.txt': 'Text',
    '.sql': 'SQL',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.html': 'HTML',
    '.vue': 'Vue',
    '.svelte': 'Svelte'
  };
  
  return languageMap[ext] || 'Unknown';
}

/**
 * Truncate content to fit within size limit
 */
function truncateContent(content: string, maxSize: number): string {
  if (content.length <= maxSize) {
    return content;
  }
  
  // Try to truncate at a reasonable boundary
  const truncated = content.substring(0, maxSize);
  const lastNewline = truncated.lastIndexOf('\n');
  
  if (lastNewline > maxSize * 0.8) {
    return truncated.substring(0, lastNewline) + '\n... (truncated)';
  }
  
  return truncated + '\n... (truncated)';
}

/**
 * Find files that are imported by the context files
 */
async function findImportFiles(context: FileContext[], maxFiles: number): Promise<FileContext[]> {
  const importFiles: FileContext[] = [];
  const importPatterns = [
    /import\s+.*?from\s+['"]([^'"]+)['"]/g,
    /require\(['"]([^'"]+)['"]\)/g,
    /#include\s+[<"]([^>"]+)[>"]/g
  ];
  
  for (const file of context) {
    if (importFiles.length >= maxFiles) break;
    
    for (const pattern of importPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(file.content)) !== null) {
        if (importFiles.length >= maxFiles) break;
        
        const importPath = match[1];
        
        // Resolve relative imports
        const basePath = path.dirname(file.path);
        const fullPath = path.resolve(basePath, importPath);
        
        // Add common extensions if not present
        const possiblePaths = [
          fullPath,
          fullPath + '.ts',
          fullPath + '.tsx',
          fullPath + '.js',
          fullPath + '.jsx',
          fullPath + '.py',
          fullPath + '.rs'
        ];
        
        for (const possiblePath of possiblePaths) {
          if (importFiles.length >= maxFiles) break;
          
          try {
            if (fs.existsSync(possiblePath) && !importFiles.some(f => f.path === possiblePath)) {
              const content = fs.readFileSync(possiblePath, 'utf-8');
              importFiles.push({
                path: possiblePath,
                content: truncateContent(content, 2000),
                language: detectLanguage(possiblePath),
                relevance: 'medium'
              });
              break;
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    }
  }
  
  return importFiles;
}

/**
 * Find related files in the same directories
 */
async function findRelatedFiles(context: FileContext[], maxFiles: number): Promise<FileContext[]> {
  const relatedFiles: FileContext[] = [];
  const directories = new Set(context.map(f => path.dirname(f.path)));
  
  for (const dir of directories) {
    if (relatedFiles.length >= maxFiles) break;
    
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        if (relatedFiles.length >= maxFiles) break;
        
        // Skip hidden files and already included files
        if (file.startsWith('.') || file === 'node_modules') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        // Only include regular files
        if (!stat.isFile()) continue;
        
        // Skip if already in context
        if (context.some(f => f.path === fullPath) || relatedFiles.some(f => f.path === fullPath)) {
          continue;
        }
        
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          relatedFiles.push({
            path: fullPath,
            content: truncateContent(content, 1500),
            language: detectLanguage(fullPath),
            relevance: 'low'
          });
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }
  
  return relatedFiles;
}

/**
 * Format context for AI prompt
 */
export function formatContextForPrompt(context: FileContext[]): string {
  if (context.length === 0) {
    return '';
  }
  
  let formatted = '\n\nAdditional Context:\n';
  formatted += '='.repeat(60) + '\n';
  
  for (const file of context) {
    formatted += `\n${file.path} (${file.language}, ${file.relevance} relevance)\n`;
    formatted += '-'.repeat(60) + '\n';
    formatted += file.content + '\n';
  }
  
  return formatted;
}

export default {
  gatherContext,
  formatContextForPrompt
};
