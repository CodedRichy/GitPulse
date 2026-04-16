import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { detectPotentialConflicts, simulateMerge, BranchConflictAnalysis } from '../core/conflict-detection.js';

async function conflictDetectHandler(context: CommandContext): Promise<CommandResult> {
  const targetBranch = context.args[0];
  const sourceBranch = context.args[1];
  const simulate = context.flags?.simulate === true;

  if (!targetBranch) {
    return {
      success: false,
      error: 'Target branch is required. Usage: pulse conflict-detect <target-branch> [source-branch] [--simulate]',
    };
  }

  try {
    if (simulate) {
      // Simulate actual merge to detect conflicts
      const result = await simulateMerge(targetBranch, sourceBranch);
      
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      if (result.canMerge) {
        return {
          success: true,
          message: `✓ Merge simulation successful. No conflicts detected between ${sourceBranch || 'current branch'} and ${targetBranch}`,
        };
      } else {
        return {
          success: false,
          message: `✗ Merge would result in conflicts.\n\nConflicting files:\n${result.conflictFiles.map(f => `  - ${f}`).join('\n')}`,
        };
      }
    } else {
      // Analyze potential conflicts without merging
      const analysis: BranchConflictAnalysis = await detectPotentialConflicts(targetBranch, sourceBranch);
      
      let message = `Conflict Analysis: ${analysis.branch} → ${analysis.baseBranch}\n\n`;
      message += `Status: ${analysis.hasConflicts ? '⚠️  Potential conflicts detected' : '✓ No conflicts expected'}\n\n`;
      message += `Recommendation: ${analysis.recommendation}\n\n`;
      
      if (analysis.predictions.length > 0) {
        message += 'File conflict predictions:\n';
        for (const prediction of analysis.predictions) {
          const riskEmoji = prediction.risk === 'high' ? '🔴' : prediction.risk === 'medium' ? '🟡' : '🟢';
          message += `  ${riskEmoji} ${prediction.file}\n`;
          message += `     Risk: ${prediction.risk}\n`;
          message += `     Reason: ${prediction.reason}\n`;
          if (prediction.conflictingLines) {
            message += `     Conflicting lines: ${prediction.conflictingLines}\n`;
          }
          message += '\n';
        }
      }

      return {
        success: !analysis.hasConflicts,
        message,
        data: analysis,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to detect conflicts',
    };
  }
}

export const conflictDetectCommand: CommandRegistration = {
  name: 'conflict-detect',
  description: 'Detect potential merge conflicts before merging (use --simulate for actual merge test)',
  handler: conflictDetectHandler,
  aliases: ['detect-conflicts', 'predict-conflicts'],
};
