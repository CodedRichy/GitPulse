import { GitOperations } from './git.js';
import { loadProjectConfig, type GitPulseProjectConfig } from './gitpulse-config.js';
import { loadCustomGates } from './custom-gate.js';
import { GitleaksBridge } from './gitleaks-bridge.js';
import * as fs from 'fs';
import * as path from 'path';

export interface QualityGate {
  name: string;
  description: string;
  check(changes: FileChange[]): Promise<GateResult>;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  diff?: string;
  content?: string;
}

export interface GateResult {
  gateName: string;
  passed: boolean;
  score: number; // 0-100
  severity: 'critical' | 'high' | 'medium' | 'low';
  issues: QualityIssue[];
  suggestions: string[];
  duration: number; // ms
}

export interface QualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'maintainability' | 'style' | 'documentation';
  file: string;
  line?: number;
  column?: number;
  message: string;
  code?: string;
  fix?: string;
}

export interface QualityReport {
  passed: boolean;
  overallScore: number;
  gates: GateResult[];
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  duration: number;
}

// Helper function to check if file is a test file
function isTestFile(filePath: string): boolean {
  return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filePath) ||
         filePath.includes('/test/') ||
         filePath.includes('/tests/') ||
         filePath.includes('/__tests__/') ||
         filePath.includes('/spec/');
}

// Security patterns to detect
const SECURITY_PATTERNS = {
  // Hardcoded secrets
  hardcodedSecrets: [
    { pattern: /password\s*=\s*["'][^"']{4,}["']/gi, message: 'Possible hardcoded password' },
    { pattern: /api[_-]?key\s*=\s*["'][^"']{8,}["']/gi, message: 'Possible hardcoded API key' },
    { pattern: /secret\s*=\s*["'][^"']{8,}["']/gi, message: 'Possible hardcoded secret' },
    { pattern: /token\s*=\s*["'][^"']{16,}["']/gi, message: 'Possible hardcoded token' },
    { pattern: /private[_-]?key\s*=\s*["'][^"']{20,}["']/gi, message: 'Possible hardcoded private key' },
    { pattern: /aws[_-]?access[_-]?key[_-]?id\s*=\s*["'][^"']{16,}["']/gi, message: 'Possible AWS access key' },
    { pattern: /aws[_-]?secret[_-]?access[_-]?key\s*=\s*["'][^"']{20,}["']/gi, message: 'Possible AWS secret key' },
  ],
  // SQL Injection vulnerabilities
  sqlInjection: [
    { pattern: /query\s*\(\s*[`"'].*\$\{.*\}/gi, message: 'Possible SQL injection via template literal' },
    { pattern: /exec\s*\(\s*["'].*\+.*\$/gi, message: 'Possible SQL injection via string concatenation' },
    { pattern: /query\s*\(\s*.*\+\s*req\./gi, message: 'Possible SQL injection with request data' },
  ],
  // XSS vulnerabilities
  xssVulnerabilities: [
    { pattern: /innerHTML\s*=\s*.*/gi, message: 'Possible XSS via innerHTML assignment' },
    { pattern: /dangerouslySetInnerHTML\s*:\s*\{\s*__html\s*:/gi, message: 'React dangerous HTML usage' },
    { pattern: /eval\s*\(/gi, message: 'Dangerous eval() usage' },
  ],
  // Path traversal
  pathTraversal: [
    { pattern: /fs\.(readFile|writeFile|access).*\+.*req\./gi, message: 'Possible path traversal with user input' },
  ],
};

// Code smell patterns
const CODE_SMELL_PATTERNS = {
  longFunctions: {
    threshold: 50, // lines
    message: 'Function exceeds recommended length (50 lines)',
  },
  longFiles: {
    threshold: 500, // lines
    message: 'File exceeds recommended length (500 lines)',
  },
  godClass: {
    threshold: 20, // methods
    message: 'Possible god class detected (too many methods)',
  },
  todoFixme: {
    pattern: /(TODO|FIXME|XXX|HACK)\s*:/gi,
    message: 'Unresolved TODO/FIXME comment found',
  },
  consoleLog: {
    pattern: /console\.(log|debug|warn|error)\s*\(/gi,
    message: 'Console statement found (remove before production)',
  },
  debuggerStatement: {
    pattern: /debugger\s*;/gi,
    message: 'Debugger statement found',
  },
};

// Security Scan Gate
export class SecurityScanGate implements QualityGate {
  name = 'security-scan';
  description = 'Scan for security vulnerabilities and hardcoded secrets';
  private gitleaks: GitleaksBridge;
  private useGitleaks: boolean;

  constructor(repoPath?: string) {
    // Don't initialize gitleaks here - it needs to be set by the engine
    // We'll lazy-initialize in the check method
    this.gitleaks = new GitleaksBridge('.');
    this.useGitleaks = false; // Will be set by the engine with proper path
  }

  setRepoPath(repoPath: string) {
    this.gitleaks = new GitleaksBridge(repoPath);
    this.useGitleaks = true;
  }

  async check(changes: FileChange[]): Promise<GateResult> {
    const startTime = Date.now();
    const issues: QualityIssue[] = [];

    // Try to use Gitleaks for secret detection
    let gitleaksAvailable = false;
    if (this.useGitleaks) {
      try {
        gitleaksAvailable = await this.gitleaks.isAvailable();
        if (gitleaksAvailable) {
          // Use Gitleaks for staged files (fast and accurate)
          const findings = await this.gitleaks.detect({ staged: true });
          const gitleaksIssues = this.gitleaks.mapFindingsToIssues(findings);
          issues.push(...gitleaksIssues);
        }
      } catch (error) {
        // Gitleaks failed, fall back to regex
        gitleaksAvailable = false;
      }
    }

    // Fall back to regex-based checks if Gitleaks not available
    if (!gitleaksAvailable) {
      for (const change of changes) {
        if (!change.content || change.status === 'deleted') continue;

        // Skip security checks for test files
        if (isTestFile(change.path)) continue;

        const lines = change.content.split('\n');

        // Check for hardcoded secrets (regex fallback)
        for (const { pattern, message } of SECURITY_PATTERNS.hardcodedSecrets) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(change.content)) !== null) {
            const lineNum = this.getLineNumber(change.content, match.index);
            issues.push({
              severity: 'critical',
              category: 'security',
              file: change.path,
              line: lineNum,
              message,
              code: this.extractCodeSnippet(lines, lineNum),
              fix: 'Use environment variables or a secrets manager',
            });
          }
        }
      }
    }

    // Always run regex-based checks for SQL injection, XSS, and path traversal
    // (Gitleaks focuses on secrets, not these patterns)
    for (const change of changes) {
      if (!change.content || change.status === 'deleted') continue;

      // Skip security checks for test files
      if (isTestFile(change.path)) continue;

      const lines = change.content.split('\n');

      // Check for SQL injection
      for (const { pattern, message } of SECURITY_PATTERNS.sqlInjection) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(change.content)) !== null) {
          const lineNum = this.getLineNumber(change.content, match.index);
          issues.push({
            severity: 'critical',
            category: 'security',
            file: change.path,
            line: lineNum,
            message,
            code: this.extractCodeSnippet(lines, lineNum),
            fix: 'Use parameterized queries or an ORM',
          });
        }
      }

      // Check for XSS
      for (const { pattern, message } of SECURITY_PATTERNS.xssVulnerabilities) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(change.content)) !== null) {
          const lineNum = this.getLineNumber(change.content, match.index);
          issues.push({
            severity: 'high',
            category: 'security',
            file: change.path,
            line: lineNum,
            message,
            code: this.extractCodeSnippet(lines, lineNum),
            fix: 'Use safe DOM manipulation or sanitization',
          });
        }
      }

      // Check for path traversal
      for (const { pattern, message } of SECURITY_PATTERNS.pathTraversal) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(change.content)) !== null) {
          const lineNum = this.getLineNumber(change.content, match.index);
          issues.push({
            severity: 'high',
            category: 'security',
            file: change.path,
            line: lineNum,
            message,
            code: this.extractCodeSnippet(lines, lineNum),
            fix: 'Validate and sanitize file paths',
          });
        }
      }
    }

    const score = Math.max(0, 100 - issues.length * 20);
    const passed = issues.filter(i => i.severity === 'critical').length === 0;

    return {
      gateName: this.name,
      passed,
      score,
      severity: 'critical',
      issues,
      suggestions: issues.length > 0 
        ? ['Review all security issues before committing', 'Use environment variables for secrets', gitleaksAvailable ? 'Gitleaks detected secrets accurately' : 'Install Gitleaks for better secret detection: https://github.com/gitleaks/gitleaks']
        : ['No security issues detected'],
      duration: Date.now() - startTime,
    };
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private extractCodeSnippet(lines: string[], lineNum: number, context: number = 2): string {
    const start = Math.max(0, lineNum - context - 1);
    const end = Math.min(lines.length, lineNum + context);
    return lines.slice(start, end).join('\n');
  }
}

// Code Smells Gate
export class CodeSmellsGate implements QualityGate {
  name = 'code-smells';
  description = 'Detect code smells and anti-patterns';

  async check(changes: FileChange[]): Promise<GateResult> {
    const startTime = Date.now();
    const issues: QualityIssue[] = [];

    for (const change of changes) {
      if (!change.content || change.status === 'deleted') continue;

      const lines = change.content.split('\n');
      const ext = path.extname(change.path).toLowerCase();

      // Check file length
      if (lines.length > CODE_SMELL_PATTERNS.longFiles.threshold) {
        issues.push({
          severity: 'medium',
          category: 'maintainability',
          file: change.path,
          message: CODE_SMELL_PATTERNS.longFiles.message,
          fix: 'Consider refactoring into smaller modules',
        });
      }

      // Check for long functions (simple heuristic)
      if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
        let currentFunctionLines = 0;
        let functionStartLine = 0;
        let inFunction = false;
        let braceCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const functionMatch = line.match(/^(export\s+)?(async\s+)?function\s+\w+\s*\(|^(export\s+)?(async\s+)?\w+\s*\([^)]*\)\s*\{?\s*=>|^(export\s+)?(async\s+)?\w+\s*\([^)]*\)\s*\{/);

          if (functionMatch && !inFunction) {
            inFunction = true;
            functionStartLine = i + 1;
            currentFunctionLines = 1;
            braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          } else if (inFunction) {
            currentFunctionLines++;
            braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

            if (braceCount === 0) {
              if (currentFunctionLines > CODE_SMELL_PATTERNS.longFunctions.threshold) {
                issues.push({
                  severity: 'medium',
                  category: 'maintainability',
                  file: change.path,
                  line: functionStartLine,
                  message: CODE_SMELL_PATTERNS.longFunctions.message,
                  fix: 'Refactor into smaller functions',
                });
              }
              inFunction = false;
            }
          }
        }
      }

      // Check for TODO/FIXME
      let match;
      const todoPattern = new RegExp(CODE_SMELL_PATTERNS.todoFixme.pattern);
      while ((match = todoPattern.exec(change.content)) !== null) {
        const lineNum = this.getLineNumber(change.content, match.index);
        issues.push({
          severity: 'low',
          category: 'maintainability',
          file: change.path,
          line: lineNum,
          message: CODE_SMELL_PATTERNS.todoFixme.message,
          code: this.extractCodeSnippet(lines, lineNum),
        });
      }

      // Check for console.log
      const consolePattern = new RegExp(CODE_SMELL_PATTERNS.consoleLog.pattern);
      while ((match = consolePattern.exec(change.content)) !== null) {
        const lineNum = this.getLineNumber(change.content, match.index);
        issues.push({
          severity: 'low',
          category: 'style',
          file: change.path,
          line: lineNum,
          message: CODE_SMELL_PATTERNS.consoleLog.message,
          code: this.extractCodeSnippet(lines, lineNum),
          fix: 'Remove console statements or use a proper logging library',
        });
      }

      // Check for debugger
      const debuggerPattern = new RegExp(CODE_SMELL_PATTERNS.debuggerStatement.pattern);
      while ((match = debuggerPattern.exec(change.content)) !== null) {
        const lineNum = this.getLineNumber(change.content, match.index);
        issues.push({
          severity: 'high',
          category: 'maintainability',
          file: change.path,
          line: lineNum,
          message: CODE_SMELL_PATTERNS.debuggerStatement.message,
          code: this.extractCodeSnippet(lines, lineNum),
          fix: 'Remove debugger statement before committing',
        });
      }
    }

    const score = Math.max(0, 100 - issues.length * 5);
    const passed = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length === 0;

    return {
      gateName: this.name,
      passed,
      score,
      severity: 'high',
      issues,
      suggestions: issues.length > 0
        ? ['Refactor long functions into smaller units', 'Remove console.log statements', 'Resolve TODO/FIXME comments']
        : ['Code looks clean!'],
      duration: Date.now() - startTime,
    };
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private extractCodeSnippet(lines: string[], lineNum: number, context: number = 1): string {
    const start = Math.max(0, lineNum - context - 1);
    const end = Math.min(lines.length, lineNum + context);
    return lines.slice(start, end).join('\n');
  }
}

// Test Coverage Gate
export class TestCoverageGate implements QualityGate {
  name = 'test-coverage';
  description = 'Verify test files exist for changed code';

  async check(changes: FileChange[]): Promise<GateResult> {
    const startTime = Date.now();
    const issues: QualityIssue[] = [];
    const gitOps = new GitOperations();
    const repoRoot = await gitOps.getRepoRoot();

    for (const change of changes) {
      if (change.status === 'deleted') continue;

      const ext = path.extname(change.path).toLowerCase();
      if (!['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs'].includes(ext)) {
        continue; // Skip non-code files
      }

      // Check if corresponding test file exists
      const dir = path.dirname(change.path);
      const basename = path.basename(change.path, ext);
      const possibleTestFiles = [
        path.join(dir, `${basename}.test${ext}`),
        path.join(dir, `${basename}.spec${ext}`),
        path.join(dir, '__tests__', `${basename}.test${ext}`),
        path.join(dir, 'test', `${basename}.test${ext}`),
        path.join(dir, 'tests', `${basename}.test${ext}`),
      ];

      // For Python
      if (ext === '.py') {
        possibleTestFiles.push(
          path.join(dir, `test_${basename}.py`),
          path.join('tests', `${basename}_test.py`)
        );
      }

      const hasTest = possibleTestFiles.some(testPath => {
        try {
          return fs.existsSync(path.join(repoRoot, testPath));
        } catch {
          return false;
        }
      });

      if (!hasTest) {
        issues.push({
          severity: 'medium',
          category: 'maintainability',
          file: change.path,
          message: `No test file found for ${change.path}`,
          fix: `Create test file: ${possibleTestFiles[0]}`,
        });
      }
    }

    const score = Math.max(0, 100 - issues.length * 10);
    const passed = issues.length === 0;

    return {
      gateName: this.name,
      passed,
      score,
      severity: 'medium',
      issues,
      suggestions: issues.length > 0
        ? ['Add tests for all new/modified code', 'Aim for >80% test coverage']
        : ['All changed files have corresponding tests'],
      duration: Date.now() - startTime,
    };
  }
}

// Documentation Gate
export class DocumentationGate implements QualityGate {
  name = 'documentation';
  description = 'Check for adequate documentation';

  async check(changes: FileChange[]): Promise<GateResult> {
    const startTime = Date.now();
    const issues: QualityIssue[] = [];

    for (const change of changes) {
      if (!change.content || change.status === 'deleted') continue;

      const ext = path.extname(change.path).toLowerCase();
      if (!['.ts', '.js', '.tsx', '.jsx', '.py'].includes(ext)) {
        continue;
      }

      // Check for JSDoc/TSDoc comments on exported functions
      const exportedFunctionPattern = /^(export\s+(async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=\s*(async\s*)?\(|export\s+class\s+(\w+))/gm;
      let match;

      while ((match = exportedFunctionPattern.exec(change.content)) !== null) {
        const funcIndex = match.index;
        const precedingText = change.content.substring(Math.max(0, funcIndex - 500), funcIndex);

        // Check if there's a JSDoc comment before
        const hasJSDoc = /\/\*\*[\s\S]*?\*\/\s*$/.test(precedingText);

        if (!hasJSDoc) {
          const lineNum = this.getLineNumber(change.content, funcIndex);
          const funcName = match[3] || match[4] || match[6];

          issues.push({
            severity: 'low',
            category: 'documentation',
            file: change.path,
            line: lineNum,
            message: `Exported function/class '${funcName}' lacks JSDoc documentation`,
            fix: 'Add JSDoc comment with description and parameters',
          });
        }
      }

      // Check for README updates (if adding new features)
      if (change.status === 'added' && ext === '.ts' && !change.path.includes('.test.')) {
        // This is a heuristic - new files should ideally be documented
        // We'll just suggest checking README
      }
    }

    const score = Math.max(0, 100 - issues.length * 5);
    const passed = true; // Documentation issues are warnings, not blockers

    return {
      gateName: this.name,
      passed,
      score,
      severity: 'low',
      issues,
      suggestions: issues.length > 0
        ? ['Add JSDoc comments to exported functions', 'Update README for new features']
        : ['Documentation looks good'],
      duration: Date.now() - startTime,
    };
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}

// Quality Gates Engine
export class QualityGatesEngine {
  private gates: QualityGate[] = [];
  private gitOps: GitOperations;
  private projectConfig: GitPulseProjectConfig | null = null;
  private repoRoot: string;

  constructor(repoRoot?: string, gitOps?: GitOperations) {
    this.repoRoot = repoRoot ? path.resolve(repoRoot) : process.cwd();
    this.gitOps = gitOps || new GitOperations(repoRoot);
    this.registerDefaultGates();
    this.loadCustomGatesFromConfig(repoRoot);
  }

  private registerDefaultGates() {
    // Security scan gate needs repo path for gitleaks
    const securityGate = new SecurityScanGate();
    securityGate.setRepoPath(this.repoRoot);
    this.gates.push(securityGate);
    this.gates.push(new CodeSmellsGate());
    this.gates.push(new TestCoverageGate());
    this.gates.push(new DocumentationGate());
  }

  private loadCustomGatesFromConfig(repoRoot?: string) {
    try {
      this.projectConfig = loadProjectConfig(repoRoot);
      if (this.projectConfig.custom_gates && this.projectConfig.custom_gates.length > 0) {
        const customGates = loadCustomGates(this.projectConfig.custom_gates);
        for (const gate of customGates) {
          // Check if custom gate is enabled in config
          const gateConfig = this.projectConfig.quality_gates[gate.name];
          if (gateConfig?.enabled !== false) { // Enabled by default if not explicitly disabled
            this.gates.push(gate);
          }
        }
      }
    } catch {
      // No project config or invalid - continue with default gates only
    }
  }

  /**
   * Get the loaded project config (for access to conventions, etc.)
   */
  getProjectConfig(): GitPulseProjectConfig | null {
    return this.projectConfig;
  }

  addGate(gate: QualityGate) {
    this.gates.push(gate);
  }

  async runAllGates(strict: boolean = false): Promise<QualityReport> {
    const startTime = Date.now();

    // Get staged changes
    const status = await this.gitOps.getStatus();
    const changes: FileChange[] = [];

    for (const file of status.staged) {
      const diff = await this.gitOps.getStagedDiffForFile(file);
      let content: string | undefined;

      try {
        const filePath = path.resolve(this.repoRoot, file);
        content = await fs.promises.readFile(filePath, 'utf-8');
      } catch {
        // File might be deleted
      }

      changes.push({
        path: file,
        status: 'modified',
        diff,
        content,
      });
    }

    // Run all gates
    const results: GateResult[] = [];
    for (const gate of this.gates) {
      const result = await gate.check(changes);
      results.push(result);
    }

    // Calculate overall score
    const overallScore = Math.round(
      results.reduce((sum, r) => sum + r.score, 0) / results.length
    );

    // Count issues by severity
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length, 0);
    const highIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'high').length, 0);
    const mediumIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'medium').length, 0);
    const lowIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'low').length, 0);

    // Determine if passed
    const passed = strict
      ? results.every(r => r.passed && r.issues.length === 0)
      : results.every(r => r.passed);

    return {
      passed,
      overallScore,
      gates: results,
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      duration: Date.now() - startTime,
    };
  }

  async runSpecificGate(gateName: string): Promise<GateResult | null> {
    const gate = this.gates.find(g => g.name === gateName);
    if (!gate) return null;

    const status = await this.gitOps.getStatus();
    const changes: FileChange[] = [];

    for (const file of status.staged) {
      const diff = await this.gitOps.getStagedDiffForFile(file);
      let content: string | undefined;

      try {
        const filePath = path.resolve(this.repoRoot, file);
        content = await fs.promises.readFile(filePath, 'utf-8');
      } catch {
        // File might be deleted
      }

      changes.push({
        path: file,
        status: 'modified',
        diff,
        content,
      });
    }

    return await gate.check(changes);
  }

  getRegisteredGates(): string[] {
    return this.gates.map(g => g.name);
  }
}

// Utility functions
export function formatQualityReport(report: QualityReport): string {
  let output = '\n';
  output += '╔═══════════════════════════════════════════════════════════╗\n';
  output += '║           QUALITY GATES REPORT                            ║\n';
  output += '╠═══════════════════════════════════════════════════════════╣\n';
  output += `║ Overall Score: ${report.overallScore.toString().padStart(3)}%                              ║\n`;
  output += `║ Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}                                    ║\n`;
  output += `║ Duration: ${(report.duration / 1000).toFixed(2)}s                                      ║\n`;
  output += '╠═══════════════════════════════════════════════════════════╣\n';
  output += '║ Issues Summary:                                           ║\n';
  output += `║   Critical: ${report.criticalIssues.toString().padStart(3)}                                 ║\n`;
  output += `║   High:     ${report.highIssues.toString().padStart(3)}                                 ║\n`;
  output += `║   Medium:   ${report.mediumIssues.toString().padStart(3)}                                 ║\n`;
  output += `║   Low:      ${report.lowIssues.toString().padStart(3)}                                 ║\n`;
  output += '╚═══════════════════════════════════════════════════════════╝\n\n';

  // Individual gate results
  for (const gate of report.gates) {
    const status = gate.passed ? '✅' : '❌';
    output += `${status} ${gate.gateName} (${gate.score}%)\n`;

    for (const issue of gate.issues.slice(0, 5)) { // Show first 5 issues
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🔵';
      output += `   ${icon} [${issue.severity.toUpperCase()}] ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`;
      output += `      ${issue.message}\n`;
      if (issue.fix) {
        output += `      💡 ${issue.fix}\n`;
      }
    }

    if (gate.issues.length > 5) {
      output += `   ... and ${gate.issues.length - 5} more issues\n`;
    }

    output += '\n';
  }

  return output;
}

export function formatQualityReportJson(report: QualityReport): object {
  return {
    passed: report.passed,
    overallScore: report.overallScore,
    duration: report.duration,
    summary: {
      critical: report.criticalIssues,
      high: report.highIssues,
      medium: report.mediumIssues,
      low: report.lowIssues,
      total: report.totalIssues,
    },
    gates: report.gates.map(g => ({
      name: g.gateName,
      passed: g.passed,
      score: g.score,
      severity: g.severity,
      issues: g.issues.map(i => ({
        severity: i.severity,
        category: i.category,
        file: i.file,
        line: i.line,
        message: i.message,
        fix: i.fix,
      })),
    })),
  };
}
