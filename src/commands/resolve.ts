import * as fs from 'fs';
import * as path from 'path';
import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { GitOperations } from '../core/git.js';
import { getAIProvider } from '../ai/providers.js';

interface ConflictInfo {
  file: string;
  content: string;
  conflictSections: ConflictSection[];
}

interface ConflictSection {
  ours: string;
  theirs: string;
  base?: string;
  startLine: number;
  endLine: number;
}

async function findConflictFiles(gitOps: GitOperations): Promise<string[]> {
  try {
    const status = await gitOps.getStatus();
    const conflictFiles: string[] = [];

    for (const file of [...status.staged, ...status.unstaged]) {
      const filePath = path.join(await gitOps.getRepoRoot(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('<<<<<<<') && content.includes('=======') && content.includes('>>>>>>>')) {
          conflictFiles.push(file);
        }
      }
    }

    return conflictFiles;
  } catch {
    return [];
  }
}

function parseConflicts(filePath: string, content: string): ConflictSection[] {
  const lines = content.split('\n');
  const conflicts: ConflictSection[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('<<<<<<< ')) {
      const startLine = i;
      const ours: string[] = [];
      const theirs: string[] = [];
      let current = ours;
      i++;

      while (i < lines.length && !lines[i].startsWith('>>>>>>> ')) {
        if (lines[i] === '=======') {
          current = theirs;
        } else {
          current.push(lines[i]);
        }
        i++;
      }

      if (i < lines.length) {
        conflicts.push({
          ours: ours.join('\n'),
          theirs: theirs.join('\n'),
          startLine,
          endLine: i,
        });
      }
    }
    i++;
  }

  return conflicts;
}

async function resolveWithAI(
  file: string,
  content: string,
  conflicts: ConflictSection[],
  strategy: 'ours' | 'theirs' | 'merge' | 'ai'
): Promise<string> {
  if (strategy === 'ours') {
    return content.replace(
      /<<<<<<< [^\n]*\n([\s\S]*?)=======[\s\S]*?>>>>>>> [^\n]*\n/g,
      '$1'
    );
  }

  if (strategy === 'theirs') {
    return content.replace(
      /<<<<<<< [^\n]*\n[\s\S]*?=======(\n[\s\S]*?)>>>>>>> [^\n]*\n/g,
      '$1'
    );
  }

  if (strategy === 'ai') {
    const ai = getAIProvider();
    if (!ai) {
      throw new Error('No AI provider configured');
    }

    let resolvedContent = content;
    let offset = 0;

    for (const conflict of conflicts) {
      const prompt = `
Resolve this git merge conflict in file "${file}". Choose the best resolution or combine both versions intelligently.

<<<<<<< OURS (Current branch changes):
${conflict.ours}
=======
${conflict.theirs}
>>>>>>> THEIRS (Incoming changes)

Provide only the resolved code without any explanation or markers.
`;

      const resolution = await ai.generate(prompt);
      const originalBlock = resolvedContent.substring(
        resolvedContent.indexOf('<<<<<<<'),
        resolvedContent.indexOf('>>>>>>>') + '>>>>>>>'.length + 1
      );
      resolvedContent = resolvedContent.replace(originalBlock, resolution.trim() + '\n');
    }

    return resolvedContent;
  }

  return content;
}

async function resolveHandler(context: CommandContext): Promise<CommandResult> {
  const gitOps = new GitOperations();
  const isRepo = await gitOps.isRepo();

  if (!isRepo) {
    return {
      success: false,
      error: 'Not a git repository.',
    };
  }

  const strategy = (context.args[0] as 'ours' | 'theirs' | 'merge' | 'ai') || 'ai';
  const specificFile = context.args[1];
  const validStrategies = ['ours', 'theirs', 'merge', 'ai'];

  if (!validStrategies.includes(strategy)) {
    return {
      success: false,
      error: `Invalid strategy: ${strategy}. Valid strategies: ${validStrategies.join(', ')}`,
    };
  }

  try {
    const repoRoot = await gitOps.getRepoRoot();
    const conflictFiles = specificFile
      ? [specificFile]
      : await findConflictFiles(gitOps);

    if (conflictFiles.length === 0) {
      return {
        success: true,
        message: 'No merge conflicts found.',
      };
    }

    const resolved: string[] = [];
    const errors: string[] = [];

    for (const file of conflictFiles) {
      const filePath = path.join(repoRoot, file);

      if (!fs.existsSync(filePath)) {
        errors.push(`File not found: ${file}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const conflicts = parseConflicts(file, content);

      if (conflicts.length === 0) {
        continue;
      }

      try {
        const resolvedContent = await resolveWithAI(file, content, conflicts, strategy);
        fs.writeFileSync(filePath, resolvedContent);

        await gitOps.stage([file]);
        resolved.push(file);
      } catch (error) {
        errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0 && resolved.length === 0) {
      return {
        success: false,
        error: `Failed to resolve conflicts:\n${errors.join('\n')}`,
      };
    }

    return {
      success: errors.length === 0,
      message: `Resolved ${resolved.length} file(s) with strategy: ${strategy}${errors.length > 0 ? `\nErrors:\n${errors.join('\n')}` : ''}`,
      data: { resolved, errors: errors.length > 0 ? errors : undefined },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve conflicts',
    };
  }
}

export const resolveCommand: CommandRegistration = {
  name: 'resolve',
  description: 'Resolve merge conflicts with AI assistance (ours/theirs/merge/ai)',
  handler: resolveHandler,
  aliases: ['conflict', 'merge-resolve'],
};
