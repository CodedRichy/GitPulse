import { Command, CommandContext, CommandResult, CommandRegistration } from './types.js';

class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();

  register(registration: CommandRegistration): void {
    const command: Command = {
      name: registration.name,
      description: registration.description,
      execute: registration.handler,
      component: registration.component,
    };

    this.commands.set(registration.name, command);

    if (registration.aliases) {
      for (const alias of registration.aliases) {
        this.aliases.set(alias, registration.name);
      }
    }
  }

  get(name: string): Command | undefined {
    const commandName = this.aliases.get(name) || name;
    return this.commands.get(commandName);
  }

  has(name: string): boolean {
    const commandName = this.aliases.get(name) || name;
    return this.commands.has(commandName);
  }

  list(): Command[] {
    return Array.from(this.commands.values());
  }

  getNames(): string[] {
    return Array.from(this.commands.keys());
  }

  async execute(name: string, context: CommandContext): Promise<CommandResult> {
    const command = this.get(name);
    if (!command) {
      return {
        success: false,
        error: `Unknown command: ${name}`,
      };
    }

    try {
      return await command.execute(context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const registry = new CommandRegistry();

export function registerCommand(registration: CommandRegistration): void {
  registry.register(registration);
}

export function getCommand(name: string): Command | undefined {
  return registry.get(name);
}

export function hasCommand(name: string): boolean {
  return registry.has(name);
}

export function listCommands(): Command[] {
  return registry.list();
}

export function executeCommand(name: string, context: CommandContext): Promise<CommandResult> {
  return registry.execute(name, context);
}
