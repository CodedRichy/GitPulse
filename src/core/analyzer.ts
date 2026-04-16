// Code Analysis Engine for GitPulse
// Provides AST-based analysis for documentation coverage and code insights

import { parse } from '@babel/parser';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';
import { FileAnalysis, FunctionInfo, ClassInfo } from './models.js';

/**
 * Analyze a source file for documentation coverage
 */
export function analyzeFile(filePath: string): FileAnalysis {
  let analysis: FileAnalysis = {
    path: filePath,
    language: getLanguage(filePath),
    totalLines: 0,
    functions: [],
    classes: [],
    exports: [],
    imports: [],
    hasModuleDoc: false,
    undocumentedFunctions: [],
    documentationCoverage: 0
  };

  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return analysis;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);

  analysis.totalLines = content.split('\n').length;

  if (analysis.language === 'typescript' || analysis.language === 'javascript') {
    analysis = analyzeTypeScript(content, analysis);
  }

  // Calculate documentation coverage
  const totalItems = analysis.functions.length + analysis.classes.length;
  const documentedItems = analysis.functions.filter((f: FunctionInfo) => f.hasJSDoc).length + 
                         analysis.classes.filter((c: ClassInfo) => c.hasJSDoc).length;
  
  analysis.documentationCoverage = totalItems > 0 ? (documentedItems / totalItems) * 100 : 100;
  analysis.undocumentedFunctions = analysis.functions.filter((f: FunctionInfo) => !f.hasJSDoc);

  return analysis;
}

/**
 * Analyze TypeScript/JavaScript code using Babel AST
 */
function analyzeTypeScript(content: string, analysis: FileAnalysis): FileAnalysis {
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'asyncGenerators',
        'dynamicImport'
      ],
      attachComment: true
    });

    // Check for module-level JSDoc
    if (ast.comments && ast.comments.length > 0) {
      const firstComment = ast.comments[0];
      if (firstComment && firstComment.loc?.start.line === 1) {
        analysis.hasModuleDoc = firstComment.value.includes('@module') || 
                                firstComment.value.includes('@fileoverview');
      }
    }

    // Traverse AST
    traverseNode(ast, analysis, content);

    return analysis;
  } catch (err) {
    console.error(`Error parsing ${analysis.path}:`, err);
    return analysis;
  }
}

/**
 * Recursively traverse AST nodes
 */
function traverseNode(node: any, analysis: FileAnalysis, content: string): void {
  if (!node || typeof node !== 'object') return;

  // Check for function declarations
  if (t.isFunctionDeclaration(node) || t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    const funcInfo = extractFunctionInfo(node, content);
    if (funcInfo) {
      analysis.functions.push(funcInfo);
    }
  }

  // Check for class declarations
  if (t.isClassDeclaration(node) || t.isClassExpression(node)) {
    const classInfo = extractClassInfo(node, content);
    if (classInfo) {
      analysis.classes.push(classInfo);
    }
  }

  // Check for imports
  if (t.isImportDeclaration(node)) {
    analysis.imports.push({
      source: node.source.value,
      specifiers: node.specifiers.map((s: any) => {
        if (t.isImportDefaultSpecifier(s)) return s.local.name;
        if (t.isImportNamespaceSpecifier(s)) return `* as ${s.local.name}`;
        if (t.isImportSpecifier(s)) {
          return t.isIdentifier(s.imported) ? s.imported.name : s.imported.value;
        }
        return s.local.name;
      })
    });
  }

  // Check for exports
  if (t.isExportNamedDeclaration(node) || t.isExportDefaultDeclaration(node) || t.isExportAllDeclaration(node)) {
    const exportName = getExportName(node);
    if (exportName) {
      analysis.exports.push(exportName);
    }
  }

  // Recursively traverse children
  for (const key in node) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
    
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(child => traverseNode(child, analysis, content));
    } else {
      traverseNode(value, analysis, content);
    }
  }
}

/**
 * Extract function information from AST node
 */
function extractFunctionInfo(node: any, content: string): FunctionInfo | null {
  let name = 'anonymous';
  let params: string[] = [];
  let returnType: string | undefined;
  let hasJSDoc = false;

  // Get function name
  if (t.isFunctionDeclaration(node) && node.id) {
    name = node.id.name;
  } else if (t.isVariableDeclarator(node.parent) && node.parent.id) {
    name = node.parent.id.name;
  } else if (t.isObjectMethod(node) && node.key && t.isIdentifier(node.key)) {
    name = node.key.name;
  } else if (t.isClassMethod(node) && node.key && t.isIdentifier(node.key)) {
    name = node.key.name;
  }

  // Get parameters
  if (node.params) {
    params = node.params.map((p: any) => {
      if (t.isIdentifier(p)) return p.name;
      if (t.isAssignmentPattern(p) && t.isIdentifier(p.left)) return `${p.left.name}?`;
      return 'param';
    });
  }

  // Get return type (TypeScript)
  if (node.returnType && t.isTSTypeAnnotation(node.returnType)) {
    returnType = content.slice(node.returnType.typeAnnotation.start, node.returnType.typeAnnotation.end);
  }

  // Check for JSDoc comments
  const leadingComments = node.leadingComments || (node.loc && getCommentsForLine(node.loc.start.line - 1, content));
  if (leadingComments && leadingComments.length > 0) {
    const lastComment = leadingComments[leadingComments.length - 1];
    hasJSDoc = lastComment.value.includes('@param') || 
               lastComment.value.includes('@returns') ||
               lastComment.value.includes('@description');
  }

  // Calculate complexity (simple line count for now)
  const startLine = node.loc?.start.line || 0;
  const endLine = node.loc?.end.line || 0;
  const complexity = endLine - startLine;

  return {
    name,
    params,
    returnType,
    hasJSDoc,
    line: startLine,
    complexity
  };
}

/**
 * Extract class information from AST node
 */
function extractClassInfo(node: any, content: string): ClassInfo | null {
  let name = 'AnonymousClass';
  let methods: string[] = [];
  let properties: string[] = [];
  let hasJSDoc = false;

  if (t.isClassDeclaration(node) && node.id) {
    name = node.id.name;
  } else if (t.isClassExpression(node) && node.id) {
    name = node.id.name;
  }

  // Get methods and properties
  if (node.body && node.body.body) {
    node.body.body.forEach((member: any) => {
      if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
        methods.push(member.key.name);
      } else if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
        properties.push(member.key.name);
      }
    });
  }

  // Check for JSDoc
  const leadingComments = node.leadingComments;
  if (leadingComments && leadingComments.length > 0) {
    hasJSDoc = true;
  }

  return {
    name,
    methods,
    properties,
    hasJSDoc,
    line: node.loc?.start.line || 0
  };
}

/**
 * Get export name from export declaration
 */
function getExportName(node: any): string | null {
  if (t.isExportDefaultDeclaration(node)) {
    return 'default';
  }
  if (t.isExportNamedDeclaration(node) && node.declaration) {
    if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
      return node.declaration.id.name;
    }
    if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
      return node.declaration.id.name;
    }
    if (t.isVariableDeclaration(node.declaration)) {
      return node.declaration.declarations.map((d: any) => 
        t.isIdentifier(d.id) ? d.id.name : 'unknown'
      ).join(', ');
    }
  }
  return null;
}

/**
 * Get comments for a specific line
 */
function getCommentsForLine(line: number, content: string): any[] {
  // Simplified - in production would parse full comment structure
  return [];
}

/**
 * Get language from file extension
 */
function getLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.rb': 'ruby',
    '.java': 'java'
  };
  return langMap[ext] || 'unknown';
}

/**
 * Analyze an entire directory for documentation coverage
 */
export function analyzeDirectory(dirPath: string, options?: { 
  include?: string[]; 
  exclude?: string[];
}): { files: FileAnalysis[]; overallCoverage: number } {
  const files: FileAnalysis[] = [];
  const include = options?.include || ['.ts', '.tsx', '.js', '.jsx'];
  const exclude = options?.exclude || ['node_modules', 'dist', 'build', '.git'];

  function walkDir(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!exclude.some(e => fullPath.includes(e))) {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (include.includes(ext)) {
          try {
            const analysis = analyzeFile(fullPath);
            files.push(analysis);
          } catch (err) {
            // Skip files that can't be parsed
          }
        }
      }
    }
  }

  walkDir(dirPath);

  // Calculate overall coverage
  const totalFuncs = files.reduce((sum, file: FileAnalysis) => sum + file.functions.length, 0);
  const documentedFuncs = files.reduce((sum, file: FileAnalysis) => 
    sum + file.functions.filter((fn: FunctionInfo) => fn.hasJSDoc).length, 0
  );
  
  const overallCoverage = totalFuncs > 0 ? (documentedFuncs / totalFuncs) * 100 : 100;

  return { files, overallCoverage };
}

export default {
  analyzeFile,
  analyzeDirectory
};
