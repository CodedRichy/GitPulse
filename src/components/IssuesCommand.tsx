import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import {   useApp   } from "ink";
import { issuesCommand } from '../commands/issues.js';
import type { CommandContext } from '../commands/types.js';

interface IssuesCommandProps {
  args: string[];
  flags: Record<string, any>;
}

export function IssuesCommand({ args, flags }: IssuesCommandProps) {
  const { exit } = useApp();
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function execute() {
      try {
        const context: CommandContext = {
          args,
          flags,
        };
        const commandResult = await issuesCommand.handler(context);
        setResult(commandResult.message || commandResult.error || 'Done');
      } catch (error) {
        setResult(error instanceof Error ? error.message : 'Error executing command');
      } finally {
        setLoading(false);
      }
    }
    execute();
  }, [args, flags]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => exit(), 1000);
    }
  }, [loading, exit]);

  if (loading) {
    return (
      <Box>
        <Text>Processing issues...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>{result}</Text>
    </Box>
  );
}

export default IssuesCommand;
