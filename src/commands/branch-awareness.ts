import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import {
  getBranchActivity,
  analyzeBranchConflictRisk,
  getAllBranchesRiskAnalysis,
  checkRemoteUpdates,
  BranchActivity,
  BranchConflictRisk,
} from '../core/branch-awareness.js';

async function branchAwarenessHandler(context: CommandContext): Promise<CommandResult> {
  const branch = context.args[0];
  const all = context.flags?.all === true;
  const checkRemote = context.flags?.remote === true;

  try {
    if (checkRemote) {
      // Check if there are remote updates
      const updates = await checkRemoteUpdates();
      
      let message = `Remote Update Check\n\n`;
      message += `Ahead: ${updates.ahead} commit(s)\n`;
      message += `Behind: ${updates.behind} commit(s)\n`;
      message += `Has updates: ${updates.hasUpdates ? 'Yes' : 'No'}\n\n`;
      
      if (updates.lastRemoteCommit) {
        message += `Last remote commit:\n`;
        message += `  Author: ${updates.lastRemoteCommit.author}\n`;
        message += `  Message: ${updates.lastRemoteCommit.message}\n`;
        message += `  Date: ${updates.lastRemoteCommit.date.toLocaleString()}\n`;
      }

      if (updates.hasUpdates) {
        message += `\n⚠️  Someone else has pushed to this branch. Consider pulling before continuing.`;
      }

      return {
        success: !updates.hasUpdates,
        message,
        data: updates,
      };
    }

    if (all) {
      // Analyze all branches
      const analyses = await getAllBranchesRiskAnalysis();
      
      let message = `Branch Conflict Risk Analysis\n\n`;
      message += `Analyzing ${analyses.length} branches...\n\n`;
      
      const highRisk = analyses.filter(a => a.risk === 'high');
      const mediumRisk = analyses.filter(a => a.risk === 'medium');
      const lowRisk = analyses.filter(a => a.risk === 'low');

      if (highRisk.length > 0) {
        message += `🔴 High Risk Branches (${highRisk.length}):\n`;
        for (const analysis of highRisk) {
          message += `  - ${analysis.branch}\n`;
          message += `    Reason: ${analysis.reason}\n`;
          if (analysis.contributors) {
            message += `    Contributors: ${analysis.contributors.map(c => c.name).join(', ')}\n`;
          }
          message += '\n';
        }
      }

      if (mediumRisk.length > 0) {
        message += `🟡 Medium Risk Branches (${mediumRisk.length}):\n`;
        for (const analysis of mediumRisk) {
          message += `  - ${analysis.branch}\n`;
          message += `    Reason: ${analysis.reason}\n`;
          if (analysis.contributors) {
            message += `    Contributors: ${analysis.contributors.map(c => c.name).join(', ')}\n`;
          }
          message += '\n';
        }
      }

      if (lowRisk.length > 0) {
        message += `🟢 Low Risk Branches (${lowRisk.length}):\n`;
        for (const analysis of lowRisk.slice(0, 5)) {
          message += `  - ${analysis.branch}\n`;
          message += `    Reason: ${analysis.reason}\n`;
        }
        if (lowRisk.length > 5) {
          message += `  ... and ${lowRisk.length - 5} more\n`;
        }
      }

      return {
        success: highRisk.length === 0,
        message,
        data: analyses,
      };
    }

    // Analyze specific branch or current branch
    const targetBranch = branch;
    const riskAnalysis = await analyzeBranchConflictRisk(targetBranch);
    
    let message = `Branch Conflict Risk: ${targetBranch}\n\n`;
    message += `Risk Level: ${riskAnalysis.risk === 'high' ? '🔴 High' : riskAnalysis.risk === 'medium' ? '🟡 Medium' : '🟢 Low'}\n`;
    message += `Reason: ${riskAnalysis.reason}\n\n`;

    if (riskAnalysis.contributors && riskAnalysis.contributors.length > 0) {
      message += `Contributors:\n`;
      for (const contributor of riskAnalysis.contributors) {
        message += `  - ${contributor.name} (${contributor.email})\n`;
        message += `    Commits: ${contributor.commitCount}\n`;
        message += `    Last commit: ${contributor.lastCommitDate.toLocaleString()}\n`;
      }
    }

    if (riskAnalysis.risk === 'high') {
      message += `\n⚠️  Recommendation: Coordinate with other developers before making changes to avoid conflicts.`;
    }

    return {
      success: riskAnalysis.risk !== 'high',
      message,
      data: riskAnalysis,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze branch awareness',
    };
  }
}

export const branchAwarenessCommand: CommandRegistration = {
  name: 'branch-awareness',
  description: 'Detect when multiple developers are working on the same branch (use --all for all branches, --remote to check remote updates)',
  handler: branchAwarenessHandler,
  aliases: ['team-activity', 'branch-risk'],
};
