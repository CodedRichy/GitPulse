import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState, useEffect } from 'react';
import {   Box, Text, useInput, useApp   } from "ink";
import { GitOperations } from '../core/git.js';
import { AIProviderFactory } from '../ai/providers.js';
import { loadConfig, getAIProviderConfig } from '../utils/config.js';
import { PRDescription, CommitInfo } from '../core/models.js';
import { ChatMessage, StatusBar, Spinner, SuccessCheck, SectionDivider, CodeBlock, ActionButton } from './ui.js';

interface PRGeneratorProps {
  dryRun?: boolean;
}

export function PRGenerator({ dryRun }: PRGeneratorProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<'generate' | 'review' | 'done' | 'error'>('generate');
  const [error, setError] = useState<string>('');
  const [pr, setPr] = useState<PRDescription | null>(null);
  const [git] = useState(() => new GitOperations());

  useEffect(() => {
    generatePR();
  }, []);

  async function generatePR() {
    try {
      const isRepo = await git.isRepo();
      if (!isRepo) {
        setError('Not a git repository');
        setStep('error');
        return;
      }

      const branch = await git.getCurrentBranch();
      const commits = await git.getRecentCommits(30);
      const fileChanges = await git.getFileChanges();
      const stagedDiff = await git.getStagedDiff();

      const config = loadConfig();
      const aiConfig = getAIProviderConfig();
      const provider = AIProviderFactory.create(config.aiProvider, aiConfig);

      const prompt = buildEnhancedPRPrompt(branch, commits, fileChanges, stagedDiff);
      const response = await provider.generate(prompt);

      const parsed = parsePRDescription(response);
      setPr(parsed);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }

  useInput((input) => {
    if (step === 'review') {
      if (input === 'c' || input === 'C') {
        if (dryRun) {
          setStep('done');
          setTimeout(() => exit(), 500);
        } else {
          // Copy to clipboard would go here
          setStep('done');
          setTimeout(() => exit(), 500);
        }
      } else if (input === 'q' || input === 'Q') {
        exit();
      }
    } else if (step === 'done' || step === 'error') {
      exit();
    }
  });

  function buildEnhancedPRPrompt(
    branch: string,
    commits: CommitInfo[],
    fileChanges: any[],
    diff: string
  ): string {
    const commitList = commits.slice(0, 15).map(c => `- ${c.hash.substring(0, 7)}: ${c.message}`).join('\n');
    
    const fileList = fileChanges.map(f => {
      const stats = f.additions || f.deletions ? ` (+${f.additions}/-${f.deletions})` : '';
      return `- ${f.path}${stats}`;
    }).join('\n');

    const diffSummary = diff.length > 2000 ? diff.substring(0, 2000) + '\n... (truncated)' : diff;

    return `Generate a comprehensive pull request description for the "${branch}" branch.

## Context

**Branch:** ${branch}

**Commits:**
${commitList}

**Files Changed:**
${fileList}

**Diff Summary:**
\`\`\`diff
${diffSummary}
\`\`\`

## Instructions

Analyze the commits, file changes, and diff to create a comprehensive PR description. Include:

1. A clear title that summarizes the purpose
2. A summary of what this PR accomplishes
3. Detailed list of changes
4. Testing checklist items
5. Any breaking changes (if applicable)
6. Related issues or PRs (if detectable from commits)

Respond with a JSON object:
{
  "title": "feat(scope): brief description following conventional commits",
  "summary": "2-3 sentence overview of what this PR does and why",
  "description": "Detailed explanation of the implementation approach and rationale",
  "changes": ["Specific change 1", "Specific change 2", "Specific change 3"],
  "testing": ["Test checklist item 1", "Test checklist item 2", "Test checklist item 3"],
  "breakingChanges": ["Any breaking changes or empty array"],
  "relatedIssues": ["Related issue numbers or PRs"]
}`;
  }

  function parsePRDescription(response: string): PRDescription {
    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          title: parsed.title || 'Update',
          description: parsed.description || '',
          changes: parsed.changes || [],
          breakingChanges: parsed.breakingChanges || [],
          summary: parsed.summary || '',
          testing: parsed.testing || [],
          relatedIssues: parsed.relatedIssues || []
        };
      }
    } catch {
      // Fallback
    }

    // Enhanced fallback parsing
    const lines = response.split('\n');
    const title = lines[0].replace(/^#+\s*/, '') || 'Update';
    
    // Try to extract sections
    let description = '';
    let changes: string[] = [];
    let testing: string[] = [];
    let breakingChanges: string[] = [];
    
    let currentSection = '';
    for (const line of lines.slice(1)) {
      if (line.match(/^##?\s*(Summary|Description)/i)) {
        currentSection = 'description';
      } else if (line.match(/^##?\s*Changes/i)) {
        currentSection = 'changes';
      } else if (line.match(/^##?\s*Testing/i)) {
        currentSection = 'testing';
      } else if (line.match(/^##?\s*Breaking/i)) {
        currentSection = 'breaking';
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const item = line.trim().substring(2);
        if (currentSection === 'changes') changes.push(item);
        else if (currentSection === 'testing') testing.push(item);
        else if (currentSection === 'breaking') breakingChanges.push(item);
      } else if (currentSection === 'description') {
        description += line + '\n';
      }
    }

    return {
      title,
      description: description.trim() || response,
      changes,
      breakingChanges,
      summary: '',
      testing,
      relatedIssues: []
    };
  }

  return (
    <Box flexDirection="column">
      {step === 'generate' && (
        <ChatMessage role="assistant" loading>
          <Spinner text="Analyzing commits and generating PR description..." />
        </ChatMessage>
      )}

      {step === 'review' && pr && (
        <>
          <ChatMessage role="assistant">
            <Box flexDirection="column">
              <Text bold>Pull Request Description</Text>
              <SectionDivider />
              
              <Box marginTop={1}>
                <Text bold color="#10B981">Title</Text>
                <CodeBlock code={pr.title} />
              </Box>

              {pr.summary && (
                <Box marginTop={1}>
                  <Text bold color="#10B981">Summary</Text>
                  <Box marginLeft={2}>
                    <Text>{pr.summary}</Text>
                  </Box>
                </Box>
              )}

              {pr.description && (
                <Box marginTop={1}>
                  <Text bold color="#10B981">Description</Text>
                  <Box marginLeft={2}>
                    <Text>{pr.description}</Text>
                  </Box>
                </Box>
              )}

              {pr.changes.length > 0 && (
                <Box marginTop={1}>
                  <Text bold color="#10B981">Changes</Text>
                  <Box flexDirection="column" marginLeft={2}>
                    {pr.changes.map((change: string, i: number) => (
                      <Text key={i} color="#A0A0A0">• {change}</Text>
                    ))}
                  </Box>
                </Box>
              )}

              {pr.testing && pr.testing.length > 0 && (
                <Box marginTop={1}>
                  <Text bold color="#50FA7B">Testing Checklist</Text>
                  <Box flexDirection="column" marginLeft={2}>
                    {pr.testing.map((item: string, i: number) => (
                      <Text key={i} color="#A0A0A0">☐ {item}</Text>
                    ))}
                  </Box>
                </Box>
              )}

              {pr.relatedIssues && pr.relatedIssues.length > 0 && (
                <Box marginTop={1}>
                  <Text bold color="#10B981">Related Issues</Text>
                  <Box flexDirection="column" marginLeft={2}>
                    {pr.relatedIssues.map((issue: string, i: number) => (
                      <Text key={i} color="#6272A4">• {issue}</Text>
                    ))}
                  </Box>
                </Box>
              )}

              {pr.breakingChanges && pr.breakingChanges.length > 0 && (
                <Box marginTop={1}>
                  <Text bold color="#FF5555">⚠ Breaking Changes</Text>
                  <Box flexDirection="column" marginLeft={2}>
                    {pr.breakingChanges.map((change: string, i: number) => (
                      <Text key={i} color="#FF5555">• {change}</Text>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </ChatMessage>
          
          <ChatMessage role="system">
            <Box>
              <ActionButton actionKey="c" label="Copy to clipboard" color="#50FA7B" />
              <ActionButton actionKey="q" label="Quit" color="#FF5555" />
              {dryRun && <Text dimColor> (dry-run)</Text>}
            </Box>
          </ChatMessage>
        </>
      )}

      {step === 'done' && (
        <ChatMessage role="assistant">
          <SuccessCheck text="PR description ready!" />
        </ChatMessage>
      )}

      {step === 'error' && (
        <ChatMessage role="system">
          <Text color="red">{error}</Text>
        </ChatMessage>
      )}

      <StatusBar mode={step === 'review' ? 'review' : step === 'error' ? 'error' : 'generate'} />
    </Box>
  );
}

export default PRGenerator;
