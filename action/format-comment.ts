import type { ActionQualityReport } from './run-quality-gates.js';

/**
 * Format a quality report as a GitHub PR comment.
 * Uses GitHub-flavored markdown with collapsible sections.
 */
export function formatPRComment(report: ActionQualityReport): string {
  const statusEmoji = report.passed ? '✅' : '❌';
  const statusText = report.passed ? 'Passed' : 'Failed';

  let comment = `<!-- gitpulse-quality-report -->\n`;
  comment += `## ${statusEmoji} GitPulse Quality Gates — ${statusText}\n\n`;

  // Summary table
  comment += `| Metric | Value |\n`;
  comment += `|--------|-------|\n`;
  comment += `| **Score** | ${report.overallScore}% |\n`;
  comment += `| **Total Issues** | ${report.totalIssues} |\n`;
  comment += `| **Duration** | ${(report.duration / 1000).toFixed(1)}s |\n\n`;

  // Issue severity breakdown (only if issues exist)
  if (report.totalIssues > 0) {
    comment += `### Issue Breakdown\n\n`;
    if (report.criticalIssues > 0) comment += `- 🔴 **Critical:** ${report.criticalIssues}\n`;
    if (report.highIssues > 0) comment += `- 🟠 **High:** ${report.highIssues}\n`;
    if (report.mediumIssues > 0) comment += `- 🟡 **Medium:** ${report.mediumIssues}\n`;
    if (report.lowIssues > 0) comment += `- 🔵 **Low:** ${report.lowIssues}\n`;
    comment += `\n`;
  }

  // Gate details (collapsible)
  for (const gate of report.gates) {
    const gateEmoji = gate.passed ? '✅' : '❌';
    const gateScore = gate.score;

    if (gate.issues.length === 0) {
      comment += `${gateEmoji} **${formatGateName(gate.gateName)}** — ${gateScore}% — No issues\n\n`;
      continue;
    }

    comment += `<details>\n`;
    comment += `<summary>${gateEmoji} <strong>${formatGateName(gate.gateName)}</strong> — ${gateScore}% — ${gate.issues.length} issue${gate.issues.length !== 1 ? 's' : ''}</summary>\n\n`;

    // Issue table
    comment += `| Severity | File | Message |\n`;
    comment += `|----------|------|---------|\n`;

    for (const issue of gate.issues.slice(0, 25)) {
      const sevEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵',
      }[issue.severity] || '⚪';

      const file = issue.line ? `\`${issue.file}:${issue.line}\`` : `\`${issue.file}\``;
      const msg = escapeMarkdown(issue.message);
      comment += `| ${sevEmoji} ${issue.severity} | ${file} | ${msg} |\n`;
    }

    if (gate.issues.length > 25) {
      comment += `\n*... and ${gate.issues.length - 25} more issues*\n`;
    }

    comment += `\n</details>\n\n`;
  }

  // Footer
  comment += `---\n`;
  comment += `*Powered by [GitPulse](https://github.com/CodedRichy/GitPulse) — Guardrails for AI-Assisted Development*\n`;

  return comment;
}

function formatGateName(name: string): string {
  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
