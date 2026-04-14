import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { GitOperations } from '../core/git.js';
import { getLastCommit, type CommitHistoryEntry } from '../utils/history.js';
import { ChatMessage, StatusBar, Spinner, SuccessCheck, ErrorX, ActionButton, SectionDivider } from './ui.js';

interface UndoRedoProps {
  action: 'undo' | 'redo';
}

export function UndoRedo({ action }: UndoRedoProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<'check' | 'confirm' | 'execute' | 'done' | 'error'>('check');
  const [error, setError] = useState<string>('');
  const [lastCommit, setLastCommit] = useState<CommitHistoryEntry | null>(null);
  const [git] = useState(() => new GitOperations());

  useEffect(() => {
    loadLastCommit();
  }, []);

  async function loadLastCommit() {
    try {
      const isRepo = await git.isRepo();
      if (!isRepo) {
        setError('Not a git repository');
        setStep('error');
        return;
      }

      const commit = getLastCommit();
      setLastCommit(commit);
      
      if (!commit) {
        setError('No commit history found');
        setStep('error');
        return;
      }

      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }

  async function executeAction() {
    try {
      setStep('execute');
      
      if (action === 'undo') {
        await git.undoCommit();
      } else {
        await git.redoCommit();
      }

      setStep('done');
      setTimeout(() => exit(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }

  useInput((input, key) => {
    if (step === 'confirm') {
      if (input === 'y' || input === 'Y') {
        executeAction();
      } else if (input === 'n' || input === 'N' || key.escape) {
        exit();
      }
    } else if (step === 'error' || step === 'done') {
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      {step === 'check' && (
        <ChatMessage role="assistant" loading>
          <Spinner text="Checking repository..." />
        </ChatMessage>
      )}

      {step === 'confirm' && lastCommit && (
        <>
          <ChatMessage role="assistant">
            <Box flexDirection="column">
              <Text bold>
                {action === 'undo' ? 'Undo last commit?' : 'Redo last undone commit?'}
              </Text>
              <SectionDivider />
              <Box flexDirection="column">
                <Text dimColor>Commit:</Text>
                <Text>{lastCommit.message}</Text>
              </Box>
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>Hash:</Text>
                <Text>{lastCommit.hash.substring(0, 8)}</Text>
              </Box>
              {lastCommit.userEdited && (
                <Box marginTop={1}>
                  <Text color="#F1FA8C">Edited by user</Text>
                </Box>
              )}
            </Box>
          </ChatMessage>
          <ChatMessage role="system">
            <Box>
              <ActionButton actionKey="Y" label="Confirm" color="#50FA7B" />
              <ActionButton actionKey="n" label="Cancel" color="#FF5555" />
            </Box>
          </ChatMessage>
        </>
      )}

      {step === 'execute' && (
        <ChatMessage role="assistant" loading>
          <Spinner text={action === 'undo' ? 'Undoing commit...' : 'Redoing commit...'} />
        </ChatMessage>
      )}

      {step === 'done' && (
        <ChatMessage role="assistant">
          <SuccessCheck text={action === 'undo' ? 'Commit undone successfully' : 'Commit redone successfully'} />
        </ChatMessage>
      )}

      {step === 'error' && (
        <ChatMessage role="system">
          <ErrorX text={error} />
        </ChatMessage>
      )}

      <StatusBar 
        branch="main" 
        mode={step === 'error' ? 'error' : step === 'done' ? 'success' : 'working'}
      />
    </Box>
  );
}

export default UndoRedo;
