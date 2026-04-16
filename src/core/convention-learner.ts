import { GitOperations } from './git.js';
import * as fs from 'fs';
import * as path from 'path';

export interface TeamConventions {
  naming: NamingConventions;
  architecture: ArchitecturalConventions;
  commitPatterns: CommitPattern[];
  fileRelationships: FileRelationship[];
  codeStyles: CodeStyleConventions;
  lastUpdated: number;
}

export interface NamingConventions {
  preferredCasing: 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case' | 'mixed';
  functionPrefixPatterns: string[];
  booleanPrefixPatterns: string[];
  interfacePrefix: string;
  typePrefix: string;
  enumPrefix: string;
  constantPattern: string;
  privateMemberPattern: string;
  examples: {
    functions: string[];
    variables: string[];
    classes: string[];
    interfaces: string[];
    types: string[];
  };
}

export interface ArchitecturalConventions {
  layerPatterns: LayerPattern[];
  importPatterns: ImportPattern[];
  forbiddenImports: ForbiddenImport[];
  moduleBoundaries: ModuleBoundary[];
  preferredAbstractions: string[];
}

export interface LayerPattern {
  name: string;
  pathPattern: RegExp;
  allowedImports: string[];
  forbiddenImports: string[];
  description: string;
}

export interface ImportPattern {
  from: string;
  to: string;
  frequency: number;
  isPreferred: boolean;
}

export interface ForbiddenImport {
  from: string;
  to: string;
  reason: string;
}

export interface ModuleBoundary {
  name: string;
  path: string;
  allowedDependencies: string[];
}

export interface CommitPattern {
  type: string;
  scope: string;
  description: string;
  frequency: number;
  examples: string[];
}

export interface FileRelationship {
  primary: string;
  related: string[];
  relationshipType: 'co-changes' | 'imports' | 'tests' | 'docs';
  strength: number; // 0-1
}

export interface CodeStyleConventions {
  quoteStyle: 'single' | 'double' | 'mixed';
  semicolonUsage: 'always' | 'never' | 'mixed';
  trailingComma: 'always' | 'never' | 'mixed';
  maxLineLength: number;
  indentStyle: 'spaces' | 'tabs' | 'mixed';
  indentSize: number;
}

export interface ConventionContext {
  relevantConventions: string[];
  similarCommits: CommitPattern[];
  relatedFiles: string[];
  suggestedScopes: string[];
  architecturalGuidance: string[];
}

const CONVENTIONS_FILE = '.gitpulse/conventions.json';

export class ConventionLearner {
  private gitOps: GitOperations;
  private conventions: TeamConventions | null = null;
  private repoPath: string;

  constructor(repoPath: string = '.') {
    this.repoPath = repoPath;
    this.gitOps = new GitOperations(repoPath);
  }

  /**
   * Load existing conventions or analyze to create them
   */
  async loadOrAnalyzeConventions(): Promise<TeamConventions> {
    const existing = this.loadConventionsFromDisk();
    if (existing) {
      this.conventions = existing;
      return existing;
    }

    return await this.analyzeRepository();
  }

  /**
   * Force re-analysis of repository
   */
  async analyzeRepository(): Promise<TeamConventions> {
    const repoRoot = await this.gitOps.getRepoRoot();
    
    const conventions: TeamConventions = {
      naming: await this.analyzeNamingConventions(repoRoot),
      architecture: await this.analyzeArchitecture(repoRoot),
      commitPatterns: await this.analyzeCommitPatterns(),
      fileRelationships: await this.analyzeFileRelationships(),
      codeStyles: await this.analyzeCodeStyles(repoRoot),
      lastUpdated: Date.now(),
    };

    this.conventions = conventions;
    this.saveConventionsToDisk(conventions);
    
    return conventions;
  }

  /**
   * Get conventions for a specific file or context
   */
  getConventionsForContext(filePath: string, changeType?: string): ConventionContext {
    if (!this.conventions) {
      return {
        relevantConventions: [],
        similarCommits: [],
        relatedFiles: [],
        suggestedScopes: [],
        architecturalGuidance: [],
      };
    }

    const relevantConventions: string[] = [];
    const relatedFiles: string[] = [];
    const suggestedScopes: string[] = [];
    const architecturalGuidance: string[] = [];

    // Find relevant naming conventions
    const ext = path.extname(filePath).toLowerCase();
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      relevantConventions.push(
        `Naming: Use ${this.conventions.naming.preferredCasing} for identifiers`,
        `Functions: ${this.conventions.naming.examples.functions.slice(0, 3).join(', ')}`,
        `Classes: ${this.conventions.naming.examples.classes.slice(0, 2).join(', ')}`
      );
    }

    // Find file relationships
    const relationships = this.conventions.fileRelationships.filter(
      r => r.primary === filePath || r.related.includes(filePath)
    );
    
    for (const rel of relationships.slice(0, 5)) {
      if (rel.primary === filePath) {
        relatedFiles.push(...rel.related.slice(0, 3));
      } else {
        relatedFiles.push(rel.primary);
      }
    }

    // Suggest scopes based on file path
    const pathParts = filePath.split('/');
    if (pathParts.length > 1) {
      suggestedScopes.push(pathParts[0]);
      if (pathParts.length > 2) {
        suggestedScopes.push(`${pathParts[0]}/${pathParts[1]}`);
      }
    }

    // Add commit patterns for similar files
    const similarCommits = this.conventions.commitPatterns
      .filter(p => {
        // Match by scope similarity
        const fileScope = pathParts[0] || 'root';
        return p.scope === fileScope || p.scope.includes(fileScope);
      })
      .slice(0, 3);

    // Check architectural boundaries
    for (const boundary of this.conventions.architecture.moduleBoundaries) {
      if (filePath.startsWith(boundary.path)) {
        architecturalGuidance.push(
          `This file is in the ${boundary.name} module`,
          `Allowed dependencies: ${boundary.allowedDependencies.join(', ')}`
        );
      }
    }

    return {
      relevantConventions,
      similarCommits,
      relatedFiles: [...new Set(relatedFiles)].slice(0, 5),
      suggestedScopes: [...new Set(suggestedScopes)],
      architecturalGuidance,
    };
  }

  /**
   * Generate AI prompt context from conventions
   */
  generatePromptContext(filePaths: string[]): string {
    if (!this.conventions || filePaths.length === 0) {
      return '';
    }

    const contexts = filePaths.map(f => this.getConventionsForContext(f));
    
    // Aggregate all contexts
    const allConventions = new Set<string>();
    const allScopes = new Set<string>();
    const allRelated = new Set<string>();
    
    for (const ctx of contexts) {
      ctx.relevantConventions.forEach(c => allConventions.add(c));
      ctx.suggestedScopes.forEach(s => allScopes.add(s));
      ctx.relatedFiles.forEach(f => allRelated.add(f));
    }

    let prompt = '\n\n**Team Conventions:**\n';
    
    if (allConventions.size > 0) {
      prompt += '\nNaming & Style:\n';
      allConventions.forEach(c => {
        prompt += `- ${c}\n`;
      });
    }

    if (allScopes.size > 0) {
      prompt += `\nSuggested commit scopes: ${Array.from(allScopes).join(', ')}\n`;
    }

    if (allRelated.size > 0) {
      prompt += `\nRelated files (often changed together): ${Array.from(allRelated).slice(0, 5).join(', ')}\n`;
    }

    // Add recent commit pattern examples
    if (this.conventions.commitPatterns.length > 0) {
      prompt += '\nRecent commit patterns:\n';
      this.conventions.commitPatterns
        .slice(0, 3)
        .forEach(p => {
          prompt += `- ${p.type}(${p.scope}): ${p.description}\n`;
        });
    }

    return prompt;
  }

  /**
   * Check if code follows team conventions
   */
  checkConventions(filePath: string, content: string): string[] {
    const violations: string[] = [];
    
    if (!this.conventions) {
      return violations;
    }

    const naming = this.conventions.naming;
    const lines = content.split('\n');

    // Check function naming
    const functionPattern = /function\s+(\w+)|const\s+(\w+)\s*=\s*(async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{/g;
    let match;
    
    while ((match = functionPattern.exec(content)) !== null) {
      const funcName = match[1] || match[2] || match[4];
      if (funcName) {
        // Check casing
        if (!this.matchesPreferredCasing(funcName, naming.preferredCasing)) {
          violations.push(`Function '${funcName}' doesn't follow ${naming.preferredCasing} convention`);
        }

        // Check prefixes
        if (naming.functionPrefixPatterns.length > 0) {
          const hasValidPrefix = naming.functionPrefixPatterns.some(prefix => 
            funcName.toLowerCase().startsWith(prefix.toLowerCase())
          );
          // Only warn if patterns are strict
        }
      }
    }

    // Check for console.log (style convention)
    if (this.conventions.codeStyles && lines.some(l => /console\.(log|debug)/.test(l))) {
      violations.push('Consider removing console.log statements (team prefers production-ready code)');
    }

    return violations;
  }

  /**
   * Get naming suggestions based on conventions
   */
  suggestName(nameType: 'function' | 'variable' | 'class' | 'interface' | 'type', 
              purpose: string): string {
    if (!this.conventions) {
      return '';
    }

    const examples = this.conventions.naming.examples;
    const similar = examples[`${nameType}s` as keyof typeof examples] || [];
    
    if (similar.length === 0) {
      return '';
    }

    // Simple heuristic: suggest based on purpose keywords
    const purposeWords = purpose.toLowerCase().split(/\s+/);
    const bestMatch = similar.find(ex => 
      purposeWords.some(word => ex.toLowerCase().includes(word))
    );

    return bestMatch || similar[0];
  }

  // Private methods for analysis

  private async analyzeNamingConventions(repoRoot: string): Promise<NamingConventions> {
    const examples = {
      functions: [] as string[],
      variables: [] as string[],
      classes: [] as string[],
      interfaces: [] as string[],
      types: [] as string[],
    };

    const casingCounts: Record<string, number> = {
      camelCase: 0,
      PascalCase: 0,
      snake_case: 0,
      kebabCase: 0,
    };

    try {
      // Scan a sample of TypeScript/JavaScript files
      const sourceFiles = await this.findSourceFiles(repoRoot, 20);
      
      for (const file of sourceFiles.slice(0, 10)) {
        try {
          const content = await fs.promises.readFile(file, 'utf-8');
          
          // Extract function names
          const funcMatches = content.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*(async\s*)?\(/g);
          if (funcMatches) {
            funcMatches.forEach(m => {
              const name = m.replace(/function\s+|const\s+|=.*$/g, '').trim();
              if (name && !name.startsWith('_') && examples.functions.length < 20) {
                examples.functions.push(name);
                casingCounts[this.detectCasing(name)]++;
              }
            });
          }

          // Extract class names
          const classMatches = content.match(/class\s+(\w+)/g);
          if (classMatches) {
            classMatches.forEach(m => {
              const name = m.replace('class ', '').trim();
              if (name && examples.classes.length < 10) {
                examples.classes.push(name);
                casingCounts[this.detectCasing(name)]++;
              }
            });
          }

          // Extract interface names
          const interfaceMatches = content.match(/interface\s+(\w+)/g);
          if (interfaceMatches) {
            interfaceMatches.forEach(m => {
              const name = m.replace('interface ', '').trim();
              if (name && examples.interfaces.length < 10) {
                examples.interfaces.push(name);
              }
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // Fallback to defaults
    }

    // Determine preferred casing
    const preferredCasing = Object.entries(casingCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as NamingConventions['preferredCasing'] || 'camelCase';

    return {
      preferredCasing,
      functionPrefixPatterns: ['get', 'set', 'is', 'has', 'create', 'update', 'delete', 'handle'],
      booleanPrefixPatterns: ['is', 'has', 'can', 'should', 'will'],
      interfacePrefix: 'I',
      typePrefix: 'T',
      enumPrefix: 'E',
      constantPattern: 'UPPER_SNAKE',
      privateMemberPattern: '_prefix',
      examples,
    };
  }

  private async analyzeArchitecture(repoRoot: string): Promise<ArchitecturalConventions> {
    const layerPatterns: LayerPattern[] = [];
    const moduleBoundaries: ModuleBoundary[] = [];
    const importPatterns: ImportPattern[] = [];

    // Detect common architectural patterns
    const commonLayers = [
      { name: 'components', pattern: /components?/i },
      { name: 'services', pattern: /services?/i },
      { name: 'utils', pattern: /utils?|utilities?/i },
      { name: 'models', pattern: /models?|entities?/i },
      { name: 'hooks', pattern: /hooks?/i },
      { name: 'api', pattern: /api|endpoints?/i },
      { name: 'core', pattern: /core/i },
      { name: 'commands', pattern: /commands?|cli/i },
    ];

    for (const layer of commonLayers) {
      const layerPath = path.join(repoRoot, 'src', layer.name);
      try {
        if (fs.existsSync(layerPath)) {
          layerPatterns.push({
            name: layer.name,
            pathPattern: layer.pattern,
            allowedImports: ['utils', 'models', 'core'],
            forbiddenImports: [],
            description: `${layer.name} layer detected`,
          });

          moduleBoundaries.push({
            name: layer.name,
            path: `src/${layer.name}`,
            allowedDependencies: ['src/utils', 'src/core'],
          });
        }
      } catch {
        // Layer doesn't exist
      }
    }

    return {
      layerPatterns,
      importPatterns,
      forbiddenImports: [],
      moduleBoundaries,
      preferredAbstractions: ['hooks', 'services', 'utils'],
    };
  }

  private async analyzeCommitPatterns(): Promise<CommitPattern[]> {
    try {
      // Get recent commit messages
      const log = await this.gitOps.getRecentCommits(50);
      const patterns: Map<string, CommitPattern> = new Map();

      for (const commit of log) {
        // Parse conventional commit format
        const match = commit.message.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
        if (match) {
          const [, type, scope, description] = match;
          const key = `${type}(${scope})`;
          
          const existing = patterns.get(key);
          if (existing) {
            existing.frequency++;
            if (existing.examples.length < 3) {
              existing.examples.push(description);
            }
          } else {
            patterns.set(key, {
              type,
              scope: scope || 'general',
              description,
              frequency: 1,
              examples: [description],
            });
          }
        }
      }

      return Array.from(patterns.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10);
    } catch {
      return [];
    }
  }

  private async analyzeFileRelationships(): Promise<FileRelationship[]> {
    try {
      // Analyze co-changes from recent commits
      const log = await this.gitOps.getRecentCommits(30);
      const coChangeMap: Map<string, Map<string, number>> = new Map();

      for (const commit of log) {
        const files = commit.files || [];
        
        // Count co-changes
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            const file1 = files[i];
            const file2 = files[j];
            
            if (!coChangeMap.has(file1)) {
              coChangeMap.set(file1, new Map());
            }
            if (!coChangeMap.has(file2)) {
              coChangeMap.set(file2, new Map());
            }
            
            const count1 = coChangeMap.get(file1)!.get(file2) || 0;
            coChangeMap.get(file1)!.set(file2, count1 + 1);
            
            const count2 = coChangeMap.get(file2)!.get(file1) || 0;
            coChangeMap.get(file2)!.set(file1, count2 + 1);
          }
        }
      }

      // Convert to relationships
      const relationships: FileRelationship[] = [];
      const processed = new Set<string>();

      for (const [primary, relatedMap] of coChangeMap) {
        const related = Array.from(relatedMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        if (related.length > 0) {
          const relatedFiles = related.map(([file, count]) => file);
          const maxCount = related[0][1];
          
          relationships.push({
            primary,
            related: relatedFiles,
            relationshipType: 'co-changes',
            strength: Math.min(maxCount / 5, 1), // Normalize to 0-1
          });
        }
      }

      return relationships.slice(0, 20);
    } catch {
      return [];
    }
  }

  private async analyzeCodeStyles(repoRoot: string): Promise<CodeStyleConventions> {
    let singleQuotes = 0;
    let doubleQuotes = 0;
    let semicolons = 0;
    let noSemicolons = 0;
    let trailingCommas = 0;
    let noTrailingCommas = 0;

    try {
      const sourceFiles = await this.findSourceFiles(repoRoot, 10);
      
      for (const file of sourceFiles.slice(0, 5)) {
        try {
          const content = await fs.promises.readFile(file, 'utf-8');
          const lines = content.split('\n');

          for (const line of lines.slice(0, 50)) {
            // Count quotes
            const single = (line.match(/'/g) || []).length;
            const double = (line.match(/"/g) || []).length;
            if (single > double) singleQuotes++;
            else if (double > single) doubleQuotes++;

            // Count semicolons
            if (line.trim().endsWith(';')) semicolons++;
            else if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
              noSemicolons++;
            }
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Fallback
    }

    return {
      quoteStyle: singleQuotes > doubleQuotes ? 'single' : 'double',
      semicolonUsage: semicolons > noSemicolons ? 'always' : 'never',
      trailingComma: 'always', // Default
      maxLineLength: 100,
      indentStyle: 'spaces',
      indentSize: 2,
    };
  }

  private async findSourceFiles(repoRoot: string, limit: number): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (dir: string) => {
      if (files.length >= limit) return;
      
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (files.length >= limit) break;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && 
              entry.name !== 'node_modules' && entry.name !== 'dist') {
            await scanDir(fullPath);
          } else if (entry.isFile() && 
                     (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ||
                      entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    await scanDir(path.join(repoRoot, 'src'));
    return files;
  }

  private detectCasing(name: string): string {
    if (name.includes('_')) return 'snake_case';
    if (name.includes('-')) return 'kebabCase';
    if (name[0] === name[0].toUpperCase()) return 'PascalCase';
    return 'camelCase';
  }

  private matchesPreferredCasing(name: string, preferred: string): boolean {
    switch (preferred) {
      case 'camelCase':
        return /^[a-z][a-zA-Z0-9]*$/.test(name);
      case 'PascalCase':
        return /^[A-Z][a-zA-Z0-9]*$/.test(name);
      case 'snake_case':
        return /^[a-z][a-z0-9_]*$/.test(name);
      case 'kebab-case':
        return /^[a-z][a-z0-9-]*$/.test(name);
      default:
        return true;
    }
  }

  private loadConventionsFromDisk(): TeamConventions | null {
    try {
      if (fs.existsSync(CONVENTIONS_FILE)) {
        const data = fs.readFileSync(CONVENTIONS_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch {
      // File doesn't exist or is corrupted
    }
    return null;
  }

  private saveConventionsToDisk(conventions: TeamConventions): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(CONVENTIONS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Convert regex patterns to strings for serialization
      const serialized = {
        ...conventions,
        architecture: {
          ...conventions.architecture,
          layerPatterns: conventions.architecture.layerPatterns.map(p => ({
            ...p,
            pathPattern: p.pathPattern.toString(),
          })),
        },
      };

      fs.writeFileSync(CONVENTIONS_FILE, JSON.stringify(serialized, null, 2));
    } catch {
      // Fail silently - conventions will be re-analyzed next time
    }
  }
}

// Utility function to get singleton instance
let learnerInstance: ConventionLearner | null = null;

export function getConventionLearner(repoPath: string = '.'): ConventionLearner {
  if (!learnerInstance) {
    learnerInstance = new ConventionLearner(repoPath);
  }
  return learnerInstance;
}

export function resetConventionLearner(): void {
  learnerInstance = null;
}

export async function loadOrRefreshConventions(repoPath: string = '.'): Promise<TeamConventions> {
  const learner = getConventionLearner(repoPath);
  return await learner.loadOrAnalyzeConventions();
}
