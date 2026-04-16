import { describe, it, expect } from 'vitest';
import { formatPRComment } from '../format-comment.js';
import type { ActionQualityReport } from '../run-quality-gates.js';

function makeReport(overrides: Partial<ActionQualityReport> = {}): ActionQualityReport {
  return {
    passed: true,
    overallScore: 100,
    gates: [],
    totalIssues: 0,
    criticalIssues: 0,
    highIssues: 0,
    mediumIssues: 0,
    lowIssues: 0,
    duration: 1234,
    ...overrides,
  };
}

describe('formatPRComment', () => {
  it('includes hidden marker for comment updates', () => {
    const comment = formatPRComment(makeReport());
    expect(comment).toContain('<!-- gitpulse-quality-report -->');
  });

  it('shows passed status when passed', () => {
    const comment = formatPRComment(makeReport({ passed: true }));
    expect(comment).toContain('✅');
    expect(comment).toContain('Passed');
  });

  it('shows failed status when failed', () => {
    const comment = formatPRComment(makeReport({ passed: false }));
    expect(comment).toContain('❌');
    expect(comment).toContain('Failed');
  });

  it('includes score in summary table', () => {
    const comment = formatPRComment(makeReport({ overallScore: 85 }));
    expect(comment).toContain('85%');
  });

  it('shows issue breakdown when issues exist', () => {
    const comment = formatPRComment(makeReport({
      totalIssues: 5,
      criticalIssues: 1,
      highIssues: 2,
      mediumIssues: 1,
      lowIssues: 1,
    }));
    expect(comment).toContain('🔴 **Critical:** 1');
    expect(comment).toContain('🟠 **High:** 2');
    expect(comment).toContain('🟡 **Medium:** 1');
    expect(comment).toContain('🔵 **Low:** 1');
  });

  it('renders gate details in collapsible sections', () => {
    const comment = formatPRComment(makeReport({
      totalIssues: 1,
      criticalIssues: 1,
      gates: [{
        gateName: 'security-scan',
        passed: false,
        score: 60,
        severity: 'critical',
        issues: [{
          severity: 'critical',
          category: 'security',
          file: 'src/config.ts',
          line: 10,
          message: 'Hardcoded password detected',
        }],
        suggestions: [],
        duration: 100,
      }],
    }));
    expect(comment).toContain('<details>');
    expect(comment).toContain('Security Scan');
    expect(comment).toContain('`src/config.ts:10`');
    expect(comment).toContain('Hardcoded password detected');
    expect(comment).toContain('</details>');
  });

  it('shows clean gate without collapsible', () => {
    const comment = formatPRComment(makeReport({
      gates: [{
        gateName: 'documentation',
        passed: true,
        score: 100,
        severity: 'low',
        issues: [],
        suggestions: [],
        duration: 50,
      }],
    }));
    expect(comment).toContain('Documentation');
    expect(comment).toContain('No issues');
    expect(comment).not.toContain('<details>');
  });

  it('includes GitPulse footer', () => {
    const comment = formatPRComment(makeReport());
    expect(comment).toContain('GitPulse');
    expect(comment).toContain('Guardrails');
  });

  it('escapes pipe characters in messages', () => {
    const comment = formatPRComment(makeReport({
      totalIssues: 1,
      gates: [{
        gateName: 'code-smells',
        passed: true,
        score: 90,
        severity: 'low',
        issues: [{
          severity: 'low',
          category: 'style',
          file: 'test.ts',
          message: 'Use foo | bar instead',
        }],
        suggestions: [],
        duration: 50,
      }],
    }));
    expect(comment).toContain('foo \\| bar');
  });
});
