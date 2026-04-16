import * as core from '@actions/core';
import * as github from '@actions/github';
import { runQualityGatesForAction } from './run-quality-gates.js';
import { formatPRComment } from './format-comment.js';

async function run(): Promise<void> {
  try {
    // Read inputs
    const token = core.getInput('github-token', { required: true });
    const strict = core.getInput('strict') === 'true';
    const shouldComment = core.getInput('comment') !== 'false';
    const gatesInput = core.getInput('gates');
    const failOn = core.getInput('fail-on') || 'critical';

    const gates = gatesInput === 'all' ? undefined : gatesInput.split(',').map(g => g.trim());

    core.info('🔍 Running GitPulse quality gates...');

    // Run quality gates
    const report = await runQualityGatesForAction({ strict, gates });

    // Set outputs
    core.setOutput('passed', report.passed.toString());
    core.setOutput('score', report.overallScore.toString());
    core.setOutput('issues', report.totalIssues.toString());
    core.setOutput('report', JSON.stringify(report));

    // Post PR comment if enabled and in PR context
    const context = github.context;
    if (shouldComment && context.payload.pull_request) {
      const octokit = github.getOctokit(token);
      const prNumber = context.payload.pull_request.number;
      const comment = formatPRComment(report);

      // Find existing GitPulse comment to update
      const { data: comments } = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
      });

      const existingComment = comments.find(
        (c: { body?: string }) => c.body?.includes('<!-- gitpulse-quality-report -->')
      );

      if (existingComment) {
        await octokit.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: existingComment.id,
          body: comment,
        });
        core.info('📝 Updated existing PR comment');
      } else {
        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
          body: comment,
        });
        core.info('📝 Posted PR comment');
      }
    }

    // Log summary
    core.info(`\nScore: ${report.overallScore}%`);
    core.info(`Issues: ${report.totalIssues} (${report.criticalIssues} critical, ${report.highIssues} high)`);

    // Determine failure
    const shouldFail = shouldFailCheck(report, failOn);
    if (shouldFail) {
      core.setFailed(
        `Quality gates failed: ${report.totalIssues} issues found (${report.criticalIssues} critical, ${report.highIssues} high)`
      );
    } else {
      core.info('✅ Quality gates passed');
    }
  } catch (error) {
    core.setFailed(`GitPulse action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function shouldFailCheck(
  report: { passed: boolean; criticalIssues: number; highIssues: number; mediumIssues: number; lowIssues: number },
  failOn: string
): boolean {
  switch (failOn) {
    case 'critical':
      return report.criticalIssues > 0;
    case 'high':
      return report.criticalIssues > 0 || report.highIssues > 0;
    case 'medium':
      return report.criticalIssues > 0 || report.highIssues > 0 || report.mediumIssues > 0;
    case 'low':
      return !report.passed;
    default:
      return report.criticalIssues > 0;
  }
}

run();
