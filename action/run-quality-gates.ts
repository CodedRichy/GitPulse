import * as fs from 'fs';
import * as path from 'path';

/**
 * Minimal quality gate runner for GitHub Actions context.
 * Does NOT depend on Ink/CLI — uses core modules directly.
 */

// Import types that the quality gates engine uses
interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  diff?: string;
  content?: string;
}

interface QualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line?: number;
  message: string;
  fix?: string;
}

interface GateResult {
  gateName: string;
  passed: boolean;
  score: number;
  severity: string;
  issues: QualityIssue[];
  suggestions: string[];
  duration: number;
}

export interface ActionQualityReport {
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

interface RunOptions {
  strict?: boolean;
  gates?: string[];
}

/**
 * Run quality gates in GitHub Actions context.
 * Scans all changed files in the working directory.
 */
export async function runQualityGatesForAction(options: RunOptions): Promise<ActionQualityReport> {
  const startTime = Date.now();

  // Dynamically import to avoid bundling issues
  const { QualityGatesEngine } = await import('../src/core/quality-gates.js');
  const { loadProjectConfig, isGateEnabled } = await import('../src/core/gitpulse-config.js');

  const engine = new QualityGatesEngine('.');
  const config = loadProjectConfig('.');

  // Run specific gates or all
  if (options.gates && options.gates.length > 0) {
    const results: GateResult[] = [];
    for (const gateName of options.gates) {
      if (!isGateEnabled(config, gateName)) continue;
      const result = await engine.runSpecificGate(gateName);
      if (result) results.push(result);
    }

    return buildReport(results, startTime, options.strict ?? false);
  }

  // Run all gates
  const report = await engine.runAllGates(options.strict ?? false);
  return {
    passed: report.passed,
    overallScore: report.overallScore,
    gates: report.gates,
    totalIssues: report.totalIssues,
    criticalIssues: report.criticalIssues,
    highIssues: report.highIssues,
    mediumIssues: report.mediumIssues,
    lowIssues: report.lowIssues,
    duration: report.duration,
  };
}

function buildReport(results: GateResult[], startTime: number, strict: boolean): ActionQualityReport {
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const criticalIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length, 0);
  const highIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'high').length, 0);
  const mediumIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'medium').length, 0);
  const lowIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'low').length, 0);
  const overallScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 100;

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
