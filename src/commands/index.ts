import { registry } from './registry.js';
import { initCommand } from './init.js';
import { resolveCommand } from './resolve.js';
import { testCommand } from './test.js';
import { mcpCommand } from './mcp.js';

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

export function initializeCommands(): void {
  registry.register(initCommand);
  registry.register(resolveCommand);
  registry.register(testCommand);
  registry.register(mcpCommand);
}

export function getAvailableCommands(): string[] {
  return registry.getNames();
}
