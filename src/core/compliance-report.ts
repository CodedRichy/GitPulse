import { AuditLogbook, type AuditEntry } from './audit-logbook.js';

/**
 * Compliance Report Generator
 * 
 * Generates Markdown compliance reports from audit logbook data.
 * Useful for regulatory requirements, team reviews, and quality tracking.
 */

export interface ComplianceReportOptions {
  title?: string;
  period?: 'day' | 'week' | 'month' | 'all';
  includeTrends?: boolean;
  includeDetails?: boolean;
  includeOverrides?: boolean;
}

export interface QualityTrend {
  date: string;
  score: number;
  passed: boolean;
  issues: number;
}

export class ComplianceReportGenerator {
  private auditLogbook: AuditLogbook;

  constructor(repoPath: string = '.') {
    this.auditLogbook = new AuditLogbook(repoPath);
  }

  /**
   * Generate a Markdown compliance report
   */
  generate(options: ComplianceReportOptions = {}): string {
    const {
      title = 'GitPulse Compliance Report',
      period = 'all',
      includeTrends = true,
      includeDetails = true,
      includeOverrides = true,
    } = options;

    const stats = this.auditLogbook.getStats();
    const entries = this.filterEntriesByPeriod(this.auditLogbook.getRecent(1000), period);
    const trends = includeTrends ? this.calculateTrends(entries) : [];
    const overrides = includeOverrides ? entries.filter(e => e.override) : [];

    let report = `# ${title}\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Period:** ${period === 'all' ? 'All time' : `Last ${period}`}\n\n`;

    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Scans | ${stats.totalEntries} |\n`;
    report += `| Pass Rate | ${stats.passRate}% |\n`;
    report += `| Average Quality Score | ${stats.averageQualityScore}% |\n`;
    report += `| Critical Issues | ${stats.criticalIssuesCount} |\n`;
    report += `| Overrides | ${stats.totalOverrides} |\n\n`;

    // Quality Trends
    if (includeTrends && trends.length > 0) {
      report += `## Quality Trends\n\n`;
      report += `### Recent Quality Scores\n\n`;
      report += `| Date | Score | Status | Issues |\n`;
      report += `|------|-------|--------|--------|\n`;
      
      trends.slice(0, 10).forEach(trend => {
        const status = trend.passed ? '✓' : '✗';
        report += `| ${trend.date} | ${trend.score}% | ${status} | ${trend.issues} |\n`;
      });
      report += `\n`;
    }

    // Override Log
    if (includeOverrides && overrides.length > 0) {
      report += `## Override Log\n\n`;
      report += `| Date | Score | Justification |\n`;
      report += `|------|-------|---------------|\n`;
      
      overrides.forEach(entry => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        const justification = entry.override?.justification || 'N/A';
        report += `| ${date} | ${entry.qualityScore}% | ${justification} |\n`;
      });
      report += `\n`;
    } else if (includeOverrides) {
      report += `## Override Log\n\n`;
      report += `No overrides recorded.\n\n`;
    }

    // Detailed Scan History
    if (includeDetails && entries.length > 0) {
      report += `## Detailed Scan History\n\n`;
      report += `| Date | Branch | Score | Critical | High | Medium | Low | Status |\n`;
      report += `|------|--------|-------|----------|------|--------|-----|--------|\n`;
      
      entries.slice(0, 50).forEach(entry => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        const status = entry.passed ? '✓' : '✗';
        report += `| ${date} | ${entry.branch || 'N/A'} | ${entry.qualityScore}% | ${entry.criticalIssues} | ${entry.highIssues} | ${entry.mediumIssues} | ${entry.lowIssues} | ${status} |\n`;
      });
      report += `\n`;
    }

    // Compliance Status
    report += `## Compliance Status\n\n`;
    if (stats.criticalIssuesCount === 0 && stats.totalOverrides === 0) {
      report += `✅ **Fully Compliant** - No critical issues and no overrides.\n`;
    } else if (stats.criticalIssuesCount === 0 && stats.totalOverrides > 0) {
      report += `⚠️ **Partially Compliant** - No critical issues but ${stats.totalOverrides} override(s) recorded.\n`;
    } else {
      report += `❌ **Non-Compliant** - ${stats.criticalIssuesCount} critical issue(s) found.\n`;
    }
    report += `\n`;

    return report;
  }

  /**
   * Filter entries by time period
   */
  private filterEntriesByPeriod(entries: AuditEntry[], period: string): AuditEntry[] {
    if (period === 'all') return entries;

    const now = Date.now();
    const cutoffs: Record<string, number> = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const cutoff = cutoffs[period] || cutoffs.day;
    return entries.filter(entry => now - entry.timestamp <= cutoff);
  }

  /**
   * Calculate quality trends from entries
   */
  private calculateTrends(entries: AuditEntry[]): QualityTrend[] {
    return entries.map(entry => ({
      date: new Date(entry.timestamp).toLocaleDateString(),
      score: entry.qualityScore,
      passed: entry.passed,
      issues: entry.criticalIssues + entry.highIssues + entry.mediumIssues + entry.lowIssues,
    })).reverse(); // Show oldest to newest
  }

  /**
   * Save report to file
   */
  saveReport(report: string, outputPath: string): void {
    const fs = require('fs');
    fs.writeFileSync(outputPath, report, 'utf-8');
  }
}

export default ComplianceReportGenerator;
