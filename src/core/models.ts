// Core TypeScript interfaces for GitPulse

/**
 * AI-generated commit suggestion
 */
export interface CommitSuggestion {
  message: string;
  confidence: number;
  patternDetected?: string;
  reasoning: string[];
}

/**
 * Repository status information
 */
export interface RepoStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
  isClean: boolean;
}

/**
 * Git file change information
 */
export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
  additions: number;
  deletions: number;
  diff?: string;
}

/**
 * File explanation result
 */
export interface FileExplanation {
  path: string;
  summary: string;
  keyChanges: string[];
  complexity: 'low' | 'medium' | 'high';
}

/**
 * PR description
 */
export interface PRDescription {
  title: string;
  description: string;
  changes: string[];
  breakingChanges?: string[];
  summary?: string;
  testing?: string[];
  relatedIssues?: string[];
}

/**
 * AI Provider interface
 */
export interface AIProvider {
  name: string;
  generate(prompt: string, systemPrompt?: string): Promise<string>;
  isAvailable(): Promise<boolean>;
}

/**
 * GitPulse configuration
 */
export interface Config {
  aiProvider: 'ollama' | 'openrouter' | 'openai' | 'anthropic';
  commitStyle: 'conventional' | 'semantic' | 'simple';
  autoCommit: boolean;
  openrouterApiKey?: string;
  ollamaHost?: string;
  ollamaModel?: string;
}

/**
 * Git commit information
 */
export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

/**
 * Diff statistics
 */
export interface DiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
  fileStats: Map<string, { additions: number; deletions: number }>;
}

/**
 * Function analysis information
 */
export interface FunctionInfo {
  name: string;
  params: string[];
  returnType?: string;
  hasJSDoc: boolean;
  line: number;
  complexity: number;
}

/**
 * Class analysis information
 */
export interface ClassInfo {
  name: string;
  methods: string[];
  properties: string[];
  hasJSDoc: boolean;
  line: number;
}

/**
 * File analysis result
 */
export interface FileAnalysis {
  path: string;
  language: string;
  totalLines: number;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  exports: string[];
  imports: { source: string; specifiers: string[] }[];
  hasModuleDoc: boolean;
  undocumentedFunctions: FunctionInfo[];
  documentationCoverage: number;
}
