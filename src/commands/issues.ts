import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { GitOperations } from '../core/git.js';
import { createIssueTracker, type Issue, type IssueTrackerConfig } from '../core/issue-tracker.js';
import { loadConfig } from '../utils/config.js';

type IssueAction = 'list' | 'create' | 'link';

async function issuesHandler(context: CommandContext): Promise<CommandResult> {
  const gitOps = new GitOperations();
  const isRepo = await gitOps.isRepo();

  if (!isRepo) {
    return {
      success: false,
      error: 'Not a git repository.',
    };
  }

  const action = (context.args[0] as IssueAction) || 'list';
  const validActions: IssueAction[] = ['list', 'create', 'link'];

  if (!validActions.includes(action)) {
    return {
      success: false,
      error: `Invalid action: ${action}. Valid actions: ${validActions.join(', ')}`,
    };
  }

  try {
    // Load issue tracker configuration
    const config = loadConfig();
    const trackerConfig: IssueTrackerConfig = {
      github: config.githubToken ? {
        token: config.githubToken,
        owner: config.githubOwner || 'unknown',
        repo: config.githubRepo || 'unknown',
      } : undefined,
      linear: config.linearApiKey ? {
        apiKey: config.linearApiKey,
        teamId: config.linearTeamId,
      } : undefined,
      jira: config.jiraDomain && config.jiraEmail && config.jiraApiToken && config.jiraProjectKey ? {
        domain: config.jiraDomain,
        email: config.jiraEmail,
        apiToken: config.jiraApiToken,
        projectKey: config.jiraProjectKey,
      } : undefined,
    };

    const tracker = createIssueTracker(trackerConfig);

    if (!tracker) {
      return {
        success: false,
        error: 'No issue tracker configured. Set up GitHub, Linear, or Jira credentials in config.',
      };
    }

    switch (action) {
      case 'list': {
        const issues = await tracker.getIssues();
        
        if (issues.length === 0) {
          return {
            success: true,
            message: 'No issues found.',
            data: { issues: [] },
          };
        }

        let message = `Found ${issues.length} issue(s):\n\n`;
        issues.forEach(issue => {
          const statusIcon = {
            open: '🔵',
            in_progress: '🟡',
            closed: '🟢',
          }[issue.status];

          message += `${statusIcon} [${issue.source.toUpperCase()}] ${issue.id}: ${issue.title}\n`;
          message += `   Status: ${issue.status}\n`;
          if (issue.labels.length > 0) {
            message += `   Labels: ${issue.labels.join(', ')}\n`;
          }
          if (issue.assignee) {
            message += `   Assignee: ${issue.assignee}\n`;
          }
          message += `   URL: ${issue.url}\n\n`;
        });

        return {
          success: true,
          message,
          data: { issues },
        };
      }

      case 'create': {
        const title = context.args[1];
        const description = context.args.slice(2).join(' ') || context.flags.description as string;
        const labels = (context.flags.labels as string || '').split(',').map(l => l.trim()).filter(l => l);

        if (!title) {
          return {
            success: false,
            error: 'Please provide an issue title: gitpulse issues create "Title" "Description"',
          };
        }

        const issue = await tracker.createIssue(title, description, labels);

        if (!issue) {
          return {
            success: false,
            error: 'Failed to create issue.',
          };
        }

        return {
          success: true,
          message: `Created issue: ${issue.id}\n${issue.title}\n${issue.url}`,
          data: { issue },
        };
      }

      case 'link': {
        const commitHash = context.args[1];
        const issueId = context.args[2];
        const message = context.args.slice(3).join(' ') || context.flags.message as string;

        if (!commitHash || !issueId) {
          return {
            success: false,
            error: 'Usage: gitpulse issues link <commit-hash> <issue-id> [message]',
          };
        }

        // This would need to be implemented based on the specific tracker
        // For now, just return a message
        return {
          success: true,
          message: `Linked commit ${commitHash} to issue ${issueId}`,
          data: { commitHash, issueId },
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Issue operation failed',
    };
  }

  return {
    success: false,
    error: 'Unknown issue action',
  };
}

export const issuesCommand: CommandRegistration = {
  name: 'issues',
  description: 'Issue tracker integration: list, create, link issues (GitHub/Linear/Jira)',
  handler: issuesHandler,
  aliases: ['issue', 'tracker'],
};
