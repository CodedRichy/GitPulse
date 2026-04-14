import { ReactElement } from 'react';

export interface CommandContext {
  args: string[];
  flags: {
    dryRun?: boolean;
    edit?: boolean;
    help?: boolean;
    [key: string]: boolean | string | number | undefined;
  };
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

export interface Command {
  name: string;
  description: string;
  execute(context: CommandContext): Promise<CommandResult> | CommandResult;
  component?: React.ComponentType<CommandComponentProps>;
}

export interface CommandComponentProps {
  args: string[];
  flags: CommandContext['flags'];
  onComplete?: (result: CommandResult) => void;
}

export type CommandHandler = (context: CommandContext) => Promise<CommandResult> | CommandResult;

export interface CommandRegistration {
  name: string;
  description: string;
  handler: CommandHandler;
  component?: React.ComponentType<CommandComponentProps>;
  aliases?: string[];
}
