import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import {
  predictConflictsWithAI,
  learnFromPastConflicts,
  ConflictPredictionReport,
  TeamConflictPattern,
} from '../core/conflict-prediction.js';

async function conflictPredictHandler(context: CommandContext): Promise<CommandResult> {
  const targetBranch = context.args[0];
  const sourceBranch = context.args[1];
  const learn = context.flags?.learn === true;

  if (learn) {
    // Learn from past conflicts
    try {
      const patterns = await learnFromPastConflicts();

      let message = `Conflict Pattern Learning Results\n\n`;
      message += `Analyzed ${patterns.length} files with past conflict history\n\n`;

      if (patterns.length === 0) {
        message += 'No past conflicts found in merge history.';
      } else {
        message += `Top conflict-prone files:\n\n`;
        for (const pattern of patterns.slice(0, 10)) {
          message += `  📄 ${pattern.file}\n`;
          message += `     Conflict frequency: ${pattern.conflictFrequency}\n`;
          message += `     Last conflict: ${pattern.lastConflictDate.toLocaleDateString()}\n`;
          message += `     Common authors: ${pattern.commonAuthors.join(', ')}\n\n`;
        }
      }

      return {
        success: true,
        message,
        data: patterns,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to learn from past conflicts',
      };
    }
  }

  if (!targetBranch) {
    return {
      success: false,
      error: 'Target branch is required. Usage: pulse conflict-predict <target-branch> [source-branch] [--learn to analyze past conflicts]',
    };
  }

  try {
    // Predict conflicts with AI
    const report: ConflictPredictionReport = await predictConflictsWithAI(targetBranch, sourceBranch);

    let message = `AI Conflict Prediction Report\n\n`;
    message += `Branch: ${report.branch}\n`;
    message += `Overall Risk: ${report.overallRisk === 'high' ? '🔴 High' : report.overallRisk === 'medium' ? '🟡 Medium' : '🟢 Low'}\n`;
    message += `Summary: ${report.summary}\n\n`;

    if (report.predictions.length > 0) {
      message += `File-by-file predictions:\n\n`;
      for (const prediction of report.predictions) {
        const riskEmoji = prediction.risk === 'high' ? '🔴' : prediction.risk === 'medium' ? '🟡' : '🟢';
        message += `  ${riskEmoji} ${prediction.file}\n`;
        message += `     Probability: ${(prediction.probability * 100).toFixed(0)}%\n`;
        message += `     Risk: ${prediction.risk}\n`;
        message += `     Reason: ${prediction.reason}\n`;
        message += `     Suggested action: ${prediction.suggestedAction}\n\n`;
      }
    }

    return {
      success: report.overallRisk !== 'high',
      message,
      data: report,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to predict conflicts',
    };
  }
}

export const conflictPredictCommand: CommandRegistration = {
  name: 'conflict-predict',
  description: 'Use AI to predict likely merge conflicts before they happen (use --learn to analyze past conflict patterns)',
  handler: conflictPredictHandler,
  aliases: ['predict-conflicts', 'ai-conflicts'],
};
