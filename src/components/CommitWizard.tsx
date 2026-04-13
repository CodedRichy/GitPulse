import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { GitOperations } from '../core/git.js';
import { AIProviderFactory } from '../ai/providers.js';
import { loadConfig, getAIProviderConfig } from '../utils/config.js';
import { CommitSuggestion } from '../core/models.js';
import { addCommitToHistory, type CommitHistoryEntry } from '../utils/history.js';
import { recordCorrection, loadLearning, generateLearnedPrompt } from '../ai/learning.js';
import { ChatMessage, StatusBar, Spinner, SuccessCheck, ErrorX, ActionButton, SectionDivider, CodeBlock } from './ui.js';

interface CommitWizardProps {
  dryRun?: boolean;
  edit?: boolean;
}

type WizardStep = 'check' | 'analyze' | 'generate' | 'review' | 'edit' | 'commit' | 'done' | 'error';

export function CommitWizard({ dryRun, edit }: CommitWizardProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<WizardStep>('check');
  const [error, setError] = useState<string>('');
  const [suggestion, setSuggestion] = useState<CommitSuggestion | null>(null);
  const [diff, setDiff] = useState<string>('');
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [git] = useState(() => new GitOperations());
  
  useEffect(() => {
    runWizard();
  }, []);

  async function runWizard() {
    try {
      // Step 1: Check if this is a git repo
      setStep('check');
      const isRepo = await git.isRepo();
      if (!isRepo) {
        setError('Not a git repository');
        setStep('error');
        return;
      }

      // Step 2: Check for staged changes
      setStep('analyze');
      const status = await git.getStatus();
      
      if (status.staged.length === 0) {
        if (status.unstaged.length === 0 && status.untracked.length === 0) {
          setError('No changes to commit');
          setStep('error');
          return;
        }
        setError('No staged changes. Run "git add" first or use "gitpulse commit --all"');
        setStep('error');
        return;
      }

      // Step 3: Generate commit message
      setStep('generate');
      const stagedDiff = await git.getStagedDiff();
      setDiff(stagedDiff);
      const config = loadConfig();
      const aiConfig = getAIProviderConfig();
      
      const provider = AIProviderFactory.create(config.aiProvider, aiConfig);
      
      const prompt = buildCommitPrompt(stagedDiff, config.commitStyle);
      const response = await provider.generate(prompt);
      
      const parsed = parseCommitSuggestion(response);
      setSuggestion(parsed);
      setEditedMessage(parsed.message);
      setStep('review');

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }

  useInput((input, key) => {
    if (step === 'review') {
      if (input === 'y' || input === 'Y') {
        if (dryRun) {
          setStep('done');
          setTimeout(() => exit(), 500);
        } else {
          commitChanges();
        }
      } else if (input === 'n' || input === 'N' || key.escape) {
        exit();
      } else if (input === 'e' || input === 'E') {
        setStep('edit');
      } else if (input === 'r' || input === 'R') {
        retryGeneration();
      }
    } else if (step === 'edit') {
      if (key.return) {
        setSuggestion({ ...suggestion!, message: editedMessage });
        setStep('review');
      } else if (key.escape) {
        setEditedMessage(suggestion!.message);
        setStep('review');
      }
      // TextInput handles all other keyboard input
    } else if (step === 'error' || step === 'done') {
      exit();
    }
  });

  async function commitChanges() {
    try {
      setStep('commit');
      if (suggestion) {
        const result = await git.commit(editedMessage);
        
        // Save to history
        const status = await git.getStatus();
        const historyEntry: CommitHistoryEntry = {
          hash: result || 'unknown',
          message: editedMessage,
          aiSuggestion: suggestion.message,
          userEdited: editedMessage !== suggestion.message,
          timestamp: Date.now(),
          branch: status.branch,
          files: status.staged
        };
        addCommitToHistory(historyEntry);
      }
      setStep('done');
      setTimeout(() => exit(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }

  async function retryGeneration() {
    try {
      setStep('generate');
      const config = loadConfig();
      const aiConfig = getAIProviderConfig();
      const provider = AIProviderFactory.create(config.aiProvider, aiConfig);
      
      const prompt = buildCommitPrompt(diff, config.commitStyle);
      const response = await provider.generate(prompt);
      
      const parsed = parseCommitSuggestion(response);
      setSuggestion(parsed);
      setEditedMessage(parsed.message);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }

  function buildCommitPrompt(diff: string, style: string): string {
    const styleGuide = {
      conventional: 'Use conventional commits format: type(scope): description',
      semantic: 'Use semantic versioning style: description with version impact',
      simple: 'Use simple, clear commit message'
    }[style] || 'Use clear, concise commit message';

    let basePrompt = `Analyze this git diff and generate a commit message.

${styleGuide}

Diff:
\`\`\`
${diff.substring(0, 4000)}
\`\`\`

Respond with a JSON object:
{
  "message": "the commit message",
  "confidence": 0.95,
  "reasoning": ["reason 1", "reason 2"]
}`;

    // Apply learning if available
    const learning = loadLearning();
    if (learning.userCorrections.length > 0 || learning.commitPatterns.length > 0) {
      basePrompt = generateLearnedPrompt(basePrompt, learning);
    }

    return basePrompt;
  }

  function parseCommitSuggestion(response: string): CommitSuggestion {
    try {
      // Try to parse as JSON
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          message: parsed.message || response.trim(),
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning || ['Generated by AI']
        };
      }
    } catch {
      // Fallback to using the whole response as message
    }
    
    return {
      message: response.trim().split('\n')[0] || 'Update files',
      confidence: 0.7,
      reasoning: ['Generated by AI']
    };
  }

  return (
    <Box flexDirection="column">
      {step === 'check' && (
        <ChatMessage role="assistant" loading>
          <Spinner text="Checking repository..." />
        </ChatMessage>
      )}
      
      {step === 'analyze' && (
        <ChatMessage role="assistant" loading>
          <Spinner text="Analyzing staged changes..." />
        </ChatMessage>
      )}
      
      {step === 'generate' && (
        <ChatMessage role="assistant" loading>
          <Spinner text="Generating commit message with AI..." />
        </ChatMessage>
      )}
      
      {step === 'review' && suggestion && (
        <>
          <ChatMessage role="assistant">
            <Box flexDirection="column">
              <Text bold>Proposed commit message</Text>
              <SectionDivider />
              <CodeBlock code={editedMessage} language="commit" />
              <Box marginTop={1}>
                <Text dimColor>Confidence: </Text>
                <Text color="#D4A5FF">{Math.round(suggestion.confidence * 100)}%</Text>
              </Box>
              {suggestion.reasoning.length > 0 && (
                <Box flexDirection="column" marginTop={1}>
                  <Text dimColor>Reasoning:</Text>
                  {suggestion.reasoning.map((reason: string, i: number) => (
                    <Text key={i} dimColor>  • {reason}</Text>
                  ))}
                </Box>
              )}
            </Box>
          </ChatMessage>
          <ChatMessage role="assistant">
            <Box flexDirection="column">
              <Text bold>Diff preview</Text>
              <SectionDivider />
              <CodeBlock code={diff.substring(0, 2000)} language="diff" />
              {diff.length > 2000 && (
                <Box marginTop={1}>
                  <Text dimColor>... (diff truncated, use git diff to see full)</Text>
                </Box>
              )}
            </Box>
          </ChatMessage>
          <ChatMessage role="system">
            <Box>
              <ActionButton key="Y" label="Commit" color="#50FA7B" />
              <ActionButton key="n" label="Cancel" color="#FF5555" />
              <ActionButton key="e" label="Edit" color="#F1FA8C" />
              <ActionButton key="r" label="Retry AI" color="#8BE9FD" />
              {dryRun && <Text dimColor> (dry-run)</Text>}
            </Box>
          </ChatMessage>
        </>
      )}
      
      {step === 'edit' && (
        <>
          <ChatMessage role="assistant">
            <Box flexDirection="column">
              <Text bold>Edit commit message</Text>
              <SectionDivider />
              <Box flexDirection="column">
                <Text dimColor>Edit:</Text>
                <Box marginTop={1}>
                  <TextInput 
                    value={editedMessage} 
                    onChange={setEditedMessage}
                    showCursor={true}
                    focus={true}
                  />
                </Box>
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Enter to save, Esc to cancel</Text>
              </Box>
            </Box>
          </ChatMessage>
        </>
      )}
      
      {step === 'commit' && (
        <ChatMessage role="assistant" loading>
          <Spinner text="Creating commit..." />
        </ChatMessage>
      )}
      
      {step === 'done' && (
        <ChatMessage role="assistant">
          <SuccessCheck text="Changes committed successfully" />
        </ChatMessage>
      )}
      
      {step === 'error' && (
        <ChatMessage role="system">
          <ErrorX text={error} />
        </ChatMessage>
      )}

      <StatusBar 
        branch="main" 
        mode={step === 'review' ? 'review' : step === 'error' ? 'error' : 'working'}
      />
    </Box>
  );
}

export default CommitWizard;
