import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState, useEffect } from 'react';
import {   Box, Text, useInput, useApp   } from "ink";
import { GitOperations } from '../core/git.js';
import { AIProviderFactory } from '../ai/providers.js';
import { loadConfig, getAIProviderConfig } from '../utils/config.js';
import { CommitSuggestion } from '../core/models.js';
import { addCommitToHistory, type CommitHistoryEntry } from '../utils/history.js';
import { recordCorrection, loadLearning, generateLearnedPrompt } from '../ai/learning.js';
import { gatherContext, formatContextForPrompt } from '../utils/context.js';
import { QualityGatesEngine, QualityReport, formatQualityReport } from '../core/quality-gates.js';
import { ConventionLearner, TeamConventions, loadOrRefreshConventions } from '../core/convention-learner.js';
import { ChatMessage, StatusBar, Spinner, SuccessCheck, ErrorX, ActionButton, SectionDivider, CodeBlock } from './ui.js';

interface CommitWizardProps {
  dryRun?: boolean;
  edit?: boolean;
  strict?: boolean;
  lax?: boolean;
}

type WizardStep = 'check' | 'analyze' | 'quality-gates' | 'generate' | 'review' | 'edit' | 'commit' | 'done' | 'error';

export function CommitWizard({ dryRun, edit, strict, lax }: CommitWizardProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<WizardStep>('check');
  const [error, setError] = useState<string>('');
  const [suggestion, setSuggestion] = useState<CommitSuggestion | null>(null);
  const [diff, setDiff] = useState<string>('');
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [git] = useState(() => new GitOperations());
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [qualityGates] = useState(() => new QualityGatesEngine());
  const [conventions, setConventions] = useState<TeamConventions | null>(null);
  const [conventionLearner] = useState(() => new ConventionLearner());
  
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

      // Step 2: Check for staged changes, auto-stage if needed
      setStep('analyze');
      const status = await git.getStatus();

      if (status.staged.length === 0) {
        if (status.unstaged.length === 0 && status.untracked.length === 0) {
          setError('No changes to commit');
          setStep('error');
          return;
        }
        // Auto-stage all changed files
        await git.stageAll();
        // Reload status after staging
        const newStatus = await git.getStatus();
        if (newStatus.staged.length === 0) {
          setError('Failed to stage changes');
          setStep('error');
          return;
        }
      }

      // Step 3: Run quality gates
      setStep('quality-gates');
      const report = await qualityGates.runAllGates(strict);
      setQualityReport(report);

      // If strict mode and gates failed, stop here
      if (strict && !report.passed) {
        setError(`Quality gates failed. ${report.criticalIssues} critical issues found. Fix before committing.`);
        setStep('error');
        return;
      }

      // Step 4: Load team conventions for context
      setStep('analyze');
      const loadedConventions = await conventionLearner.loadOrAnalyzeConventions();
      setConventions(loadedConventions);

      // Step 5: Generate commit message with conventions
      setStep('generate');
      const stagedDiff = await git.getStagedDiff();
      setDiff(stagedDiff);
      const config = loadConfig();
      const aiConfig = getAIProviderConfig();

      const provider = AIProviderFactory.create(config.aiProvider, aiConfig);

      const prompt = await buildCommitPrompt(stagedDiff, config.commitStyle, loadedConventions);
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
      } else if (key.backspace || key.delete) {
        setEditedMessage(prev => prev.slice(0, -1));
      } else if (input && input.length === 1 && !key.ctrl && !key.meta) {
        setEditedMessage(prev => prev + input);
      }
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

      const prompt = await buildCommitPrompt(diff, config.commitStyle, conventions || undefined);
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

  async function buildCommitPrompt(diff: string, style: string, conventions?: TeamConventions): Promise<string> {
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
\`\`\``;

    // Add multi-file context
    const context = await gatherContext(diff, { maxFiles: 3, maxContextSize: 5000 });
    if (context.length > 0) {
      basePrompt += formatContextForPrompt(context);
    }

    // Add team conventions context if available
    if (conventions) {
      basePrompt += generateConventionContext(conventions, context);
    }

    basePrompt += `

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

  function generateConventionContext(conventions: TeamConventions, context: any[]): string {
    let contextStr = '\n\n**Team Conventions:**\n';

    // Add naming conventions
    if (conventions.naming) {
      contextStr += `\nNaming: Use ${conventions.naming.preferredCasing}\n`;
      if (conventions.naming.examples.functions.length > 0) {
        contextStr += `Examples: ${conventions.naming.examples.functions.slice(0, 3).join(', ')}\n`;
      }
    }

    // Add commit patterns
    if (conventions.commitPatterns.length > 0) {
      contextStr += '\nRecent commit patterns:\n';
      conventions.commitPatterns.slice(0, 3).forEach(p => {
        contextStr += `- ${p.type}(${p.scope}): ${p.description}\n`;
      });
    }

    // Add architectural guidance
    if (conventions.architecture.moduleBoundaries.length > 0) {
      contextStr += '\nModules: ';
      contextStr += conventions.architecture.moduleBoundaries.map(m => m.name).join(', ');
      contextStr += '\n';
    }

    return contextStr;
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
          <Spinner text={conventions ? "Analyzing staged changes..." : "Learning team conventions..."} />
        </ChatMessage>
      )}

      {step === 'quality-gates' && (
        <ChatMessage role="assistant" loading>
          <Spinner text="Running quality gates..." />
        </ChatMessage>
      )}

      {qualityReport && step === 'review' && qualityReport.totalIssues > 0 && !lax && (
        <ChatMessage role="assistant">
          <Box flexDirection="column">
            <Text bold>Quality Check Results</Text>
            <SectionDivider />
            <Text>Score: {qualityReport.overallScore}% | 
              <Text color={qualityReport.passed ? '#50FA7B' : '#FFB86C'}>
                {qualityReport.passed ? '✓ Passed' : '⚠ Warnings'}
              </Text>
            </Text>
            <Box marginTop={1}>
              <Text dimColor>Issues: </Text>
              {qualityReport.criticalIssues > 0 && (
                <Text color="#FF5555">{qualityReport.criticalIssues} critical </Text>
              )}
              {qualityReport.highIssues > 0 && (
                <Text color="#FFB86C">{qualityReport.highIssues} high </Text>
              )}
              {qualityReport.mediumIssues > 0 && (
                <Text color="#F1FA8C">{qualityReport.mediumIssues} medium </Text>
              )}
              {qualityReport.lowIssues > 0 && (
                <Text color="#8BE9FD">{qualityReport.lowIssues} low</Text>
              )}
            </Box>
            {qualityReport.criticalIssues > 0 && (
              <Box marginTop={1}>
                <Text color="#FF5555">Critical issues must be fixed before committing.</Text>
              </Box>
            )}
          </Box>
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
                <Text color="#10B981">{Math.round(suggestion.confidence * 100)}%</Text>
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

          {conventions && (
            <ChatMessage role="assistant">
              <Box flexDirection="column">
                <Text bold>Team Conventions Applied</Text>
                <SectionDivider />
                <Box marginTop={1}>
                  <Text dimColor>Naming: </Text>
                  <Text color="#50FA7B">{conventions.naming.preferredCasing}</Text>
                </Box>
                {conventions.commitPatterns.length > 0 && (
                  <Box marginTop={1}>
                    <Text dimColor>Common patterns: </Text>
                    <Text color="#F1FA8C">{conventions.commitPatterns[0].type}({conventions.commitPatterns[0].scope})</Text>
                  </Box>
                )}
                {conventions.architecture.moduleBoundaries.length > 0 && (
                  <Box marginTop={1}>
                    <Text dimColor>Modules: </Text>
                    <Text color="#8BE9FD">{conventions.architecture.moduleBoundaries.slice(0, 3).map(m => m.name).join(', ')}</Text>
                  </Box>
                )}
              </Box>
            </ChatMessage>
          )}

          <ChatMessage role="system">
            <Box>
              <ActionButton actionKey="Y" label="Commit" color="#50FA7B" />
              <ActionButton actionKey="n" label="Cancel" color="#FF5555" />
              <ActionButton actionKey="e" label="Edit" color="#F1FA8C" />
              <ActionButton actionKey="r" label="Retry AI" color="#8BE9FD" />
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
                <Text dimColor>Editing:</Text>
                <Text>{editedMessage}<Text backgroundColor="#FF79C6">_</Text></Text>
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Type to edit, Enter to save, Esc to cancel</Text>
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
