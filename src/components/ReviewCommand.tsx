import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import {   useApp   } from "ink";
import { reviewCommand } from '../commands/review.js';
import type { CommandContext } from '../commands/types.js';

interface ReviewCommandProps {
  args: string[];
  flags: Record<string, any>;
}

export function ReviewCommand({ args, flags }: ReviewCommandProps) {
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
        const commandResult = await reviewCommand.handler(context);
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
        <Text>Running code review...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>{result}</Text>
    </Box>
  );
}

export default ReviewCommand;
