import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { GitOperations } from '../core/git.js';
import { generateAIBranchSuggestions, type BranchSuggestion } from '../core/branch-intelligence.js';

type BranchAction = 'create' | 'switch' | 'delete' | 'list' | 'rename' | 'suggest';

interface BranchOptions {
  action: BranchAction;
  branchName?: string;
  newName?: string;
  baseBranch?: string;
  force?: boolean;
}

async function branchHandler(context: CommandContext): Promise<CommandResult> {
  const gitOps = new GitOperations();
  const isRepo = await gitOps.isRepo();

  if (!isRepo) {
    return {
      success: false,
      error: 'Not a git repository.',
    };
  }

  const args = context.args;
  const action = args[0] as BranchAction;
  const branchName = args[1];

  if (!action) {
    return {
      success: false,
      error: 'Please specify an action: create, switch, delete, list, rename, or suggest',
    };
  }

  const validActions: BranchAction[] = ['create', 'switch', 'delete', 'list', 'rename', 'suggest'];
  if (!validActions.includes(action)) {
    return {
      success: false,
      error: `Invalid action: ${action}. Valid actions: ${validActions.join(', ')}`,
    };
  }

  try {
    const { simpleGit } = await import('simple-git');
    const git = simpleGit();

    switch (action) {
      case 'list': {
        const branches = await git.branch(['-a']);
        const current = branches.current;
        const all = branches.all;
        return {
          success: true,
          message: `Current branch: ${current}\nAll branches:\n${all.map(b => `  ${b === current ? '* ' : '  '}${b}`).join('\n')}`,
          data: { current, branches: all },
        };
      }

      case 'create': {
        if (!branchName) {
          return {
            success: false,
            error: 'Please specify a branch name to create.',
          };
        }
        const baseBranch = context.flags.base as string || 'main';
        await git.checkoutBranch(branchName, baseBranch);
        return {
          success: true,
          message: `Created and switched to branch: ${branchName} (based on ${baseBranch})`,
          data: { branchName, baseBranch },
        };
      }

      case 'switch': {
        if (!branchName) {
          return {
            success: false,
            error: 'Please specify a branch name to switch to.',
          };
        }
        await git.checkout(branchName);
        return {
          success: true,
          message: `Switched to branch: ${branchName}`,
          data: { branchName },
        };
      }

      case 'delete': {
        if (!branchName) {
          return {
            success: false,
            error: 'Please specify a branch name to delete.',
          };
        }
        const force = context.flags.force;
        if (force) {
          await git.deleteLocalBranch(branchName, true);
        } else {
          await git.deleteLocalBranch(branchName, false);
        }
        return {
          success: true,
          message: `Deleted branch: ${branchName}`,
          data: { branchName },
        };
      }

      case 'rename': {
        if (!branchName) {
          return {
            success: false,
            error: 'Please specify the current branch name.',
          };
        }
        const newName = context.flags.to as string || args[2];
        if (!newName) {
          return {
            success: false,
            error: 'Please specify the new branch name using --to flag or as third argument.',
          };
        }
        await git.branch(['-m', branchName, newName]);
        return {
          success: true,
          message: `Renamed branch ${branchName} to ${newName}`,
          data: { oldName: branchName, newName },
        };
      }

      case 'suggest': {
        const gitOps = new GitOperations();
        const status = await gitOps.getStatus();
        const changes = [...status.staged, ...status.unstaged];
        
        if (changes.length === 0) {
          return {
            success: false,
            error: 'No changes found to generate branch suggestions.',
          };
        }

        const suggestions = await generateAIBranchSuggestions({
          changes,
          description: context.flags.description as string,
        });

        let message = 'Branch name suggestions:\n';
        suggestions.forEach((s, i) => {
          message += `\n${i + 1}. ${s.name} (${s.type})\n   ${s.description} [${Math.round(s.confidence * 100)}% confidence]\n`;
        });

        return {
          success: true,
          message,
          data: { suggestions },
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Branch operation failed',
    };
  }

  return {
    success: false,
    error: 'Unknown branch action',
  };
}

export const branchCommand: CommandRegistration = {
  name: 'branch',
  description: 'Branch management: create, switch, delete, list, rename',
  handler: branchHandler,
  aliases: ['br'],
};
