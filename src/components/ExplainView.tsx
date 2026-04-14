import React, { useState, useEffect } from 'react';
import {  Box, Text, useApp  } from "ink";
import { useGitPulseApp } from "./useGitPulseApp.js";;
import { GitOperations } from '../core/git.js';
import { AIProviderFactory } from '../ai/providers.js';
import { loadConfig, getAIProviderConfig } from '../utils/config.js';
import { FileExplanation, CommitInfo } from '../core/models.js';
import { ChatMessage, StatusBar, Spinner, SectionDivider } from './ui.js';

interface ExplainViewProps {
  filePath?: string;
}

export function ExplainView({ filePath }: ExplainViewProps) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [explanation, setExplanation] = useState<FileExplanation | null>(null);
  const [history, setHistory] = useState<CommitInfo[]>([]);
  const [git] = useState(() => new GitOperations());

  useEffect(() => {
    if (!filePath) {
      setError('Please provide a file path: gitpulse explain <file>');
      setLoading(false);
      return;
    }
    generateExplanation();
  }, [filePath]);

  async function generateExplanation() {
    try {
      if (!filePath) return;

      // Check if file exists in repo
      const isRepo = await git.isRepo();
      if (!isRepo) {
        setError('Not a git repository');
        setLoading(false);
        return;
      }

      // Get file history
      const fileHistory = await git.getFileHistory(filePath, 10);
      setHistory(fileHistory);

      // Generate explanation with AI
      const config = loadConfig();
      const aiConfig = getAIProviderConfig();
      const provider = AIProviderFactory.create(config.aiProvider, aiConfig);

      const prompt = buildExplainPrompt(filePath, fileHistory);
      const response = await provider.generate(prompt);

      const parsed = parseExplanation(response, filePath);
      setExplanation(parsed);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  function buildExplainPrompt(filePath: string, history: CommitInfo[]): string {
    const recentCommits = history.slice(0, 5).map(h => 
      `- ${h.hash.substring(0, 7)}: ${h.message}`
    ).join('\n');

    return `Analyze the evolution of this file and explain its purpose and recent changes.

File: ${filePath}

Recent commits:
${recentCommits}

Respond with a JSON object:
{
  "summary": "Brief description of the file's purpose",
  "keyChanges": ["Change 1", "Change 2", "Change 3"],
  "complexity": "low|medium|high"
}`;
  }

  function parseExplanation(response: string, path: string): FileExplanation {
    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          path,
          summary: parsed.summary || 'File analysis completed',
          keyChanges: parsed.keyChanges || [],
          complexity: parsed.complexity || 'medium'
        };
      }
    } catch {
      // Fallback
    }

    return {
      path,
      summary: response.substring(0, 200),
      keyChanges: [],
      complexity: 'medium'
    };
  }

  function getComplexityColor(complexity: string) {
    switch (complexity) {
      case 'low': return '#50FA7B';
      case 'medium': return '#F1FA8C';
      case 'high': return '#FF5555';
      default: return 'white';
    }
  }

  if (loading) {
    return (
      <ChatMessage role="assistant" loading>
        <Spinner text={`Analyzing file history for ${filePath}...`} />
      </ChatMessage>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <ChatMessage role="system">
          <Text color="red">{error}</Text>
        </ChatMessage>
        <StatusBar mode="error" />
      </Box>
    );
  }

  if (!explanation) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <ChatMessage role="assistant">
        <Box flexDirection="column">
          <Text>File analysis for </Text>
          <Text bold color="#D4A5FF">{filePath}</Text>
          <SectionDivider />
          
          <Box marginTop={1}>
            <Text bold>Summary</Text>
            <Box marginLeft={2} marginTop={0}>
              <Text>{explanation.summary}</Text>
            </Box>
          </Box>

          <Box marginTop={1}>
            <Text bold>Complexity: </Text>
            <Text color={getComplexityColor(explanation.complexity)}>
              {explanation.complexity.toUpperCase()}
            </Text>
          </Box>

          {explanation.keyChanges.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>Key Changes</Text>
              {explanation.keyChanges.map((change: string, i: number) => (
                <Box key={i} marginLeft={2}>
                  <Text color="#A0A0A0">• {change}</Text>
                </Box>
              ))}
            </Box>
          )}
          
          <SectionDivider />
          <Text dimColor>Based on {history.length} recent commits</Text>
        </Box>
      </ChatMessage>
      <StatusBar mode="explain" />
    </Box>
  );
}

export default ExplainView;
