import { registry } from './registry.js';
import { initCommand } from './init.js';
import { resolveCommand } from './resolve.js';
import { testCommand } from './test.js';
import { mcpCommand } from './mcp.js';
import { conflictDetectCommand } from './conflict-detect.js';
import { branchAwarenessCommand } from './branch-awareness.js';
import { conflictPredictCommand } from './conflict-predict.js';
import { auditCommand } from './audit.js';
import { reportCommand } from './report.js';
import { teamsCommand } from './teams.js';
import { configCommand } from './config.js';

export { Command, CommandContext, CommandResult, CommandComponentProps, CommandRegistration } from './types.js';
export {
  registry,
  registerCommand,
  getCommand,
  hasCommand,
  listCommands,
  executeCommand,
} from './registry.js';

export { initCommand } from './init.js';
export { branchCommand } from './branch.js';
export { resolveCommand } from './resolve.js';
export { reviewCommand } from './review.js';
export { testCommand } from './test.js';
export { issuesCommand } from './issues.js';
export { mcpCommand } from './mcp.js';
export { auditCommand } from './audit.js';
export { reportCommand } from './report.js';

export function initializeCommands(): void {
  registry.register(initCommand);
  registry.register(resolveCommand);
  registry.register(testCommand);
  registry.register(mcpCommand);
  registry.register(conflictDetectCommand);
  registry.register(branchAwarenessCommand);
  registry.register(conflictPredictCommand);
  registry.register(auditCommand);
  registry.register(reportCommand);
  registry.register(teamsCommand);
  registry.register(configCommand);
}

export function getAvailableCommands(): string[] {
  return registry.getNames();
}
