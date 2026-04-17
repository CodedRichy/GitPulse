import { CommandRegistration } from './types.js';
import { AuditLogbook } from '../core/audit-logbook.js';

export const auditCommand: CommandRegistration = {
  name: 'audit',
  description: 'View audit history of quality gate runs and overrides',
  handler: async (context) => {
    const logbook = new AuditLogbook('.');
    const entries = logbook.getRecent(20);
    const stats = logbook.getStats();

    let output = '\n📊 Audit Logbook Statistics:\n';
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `Total Entries: ${stats.totalEntries}\n`;
    output += `Total Overrides: ${stats.totalOverrides}\n`;
    output += `Average Quality Score: ${stats.averageQualityScore}%\n`;
    output += `Critical Issues: ${stats.criticalIssuesCount}\n`;
    output += `Pass Rate: ${stats.passRate}%\n\n`;

    if (entries.length === 0) {
      output += 'No audit entries found.\n';
    } else {
      output += '📋 Recent Audit Entries:\n';
      output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

      for (const entry of entries) {
        const date = new Date(entry.timestamp).toLocaleString();
        const status = entry.passed ? '✓ PASSED' : '✗ FAILED';
        const override = entry.override ? ` (OVERRIDDEN: "${entry.override.justification}")` : '';

        output += `\n${date} - ${status}${override}\n`;
        output += `  Branch: ${entry.branch || 'unknown'}\n`;
        output += `  Score: ${entry.qualityScore}%\n`;
        output += `  Issues: ${entry.criticalIssues} critical, ${entry.highIssues} high, ${entry.mediumIssues} medium, ${entry.lowIssues} low\n`;
        output += `  Duration: ${entry.duration}ms\n`;

        if (entry.commitHash) {
          output += `  Commit: ${entry.commitHash}\n`;
        }
      }
    }

    return {
      success: true,
      output,
    };
  },
};
