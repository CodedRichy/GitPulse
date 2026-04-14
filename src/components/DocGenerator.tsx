import React, { useState, useEffect } from 'react';
import {  Box, Text, useApp  } from "ink";
import { useGitPulseApp } from "./useGitPulseApp.js";;
import { AIProviderFactory } from '../ai/providers.js';
import { loadConfig, getAIProviderConfig } from '../utils/config.js';
import { ChatMessage, StatusBar, Spinner, SuccessCheck, SectionDivider, CodeBlock } from './ui.js';
import * as fs from 'fs';
import * as path from 'path';

interface DocGeneratorProps {
  filePath?: string;
}

interface GeneratedDoc {
  summary: string;
  description: string;
  parameters?: { name: string; description: string }[];
  returns?: string;
  examples?: string[];
}

export function DocGenerator({ filePath }: DocGeneratorProps) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [doc, setDoc] = useState<GeneratedDoc | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  useEffect(() => {
    if (filePath) {
      generateDoc();
    } else {
      setError('No file specified. Usage: gitpulse doc <file>');
      setLoading(false);
    }
  }, [filePath]);

  async function generateDoc() {
    try {
      // Read file content
      const resolvedPath = path.resolve(filePath || '');
      if (!fs.existsSync(resolvedPath)) {
        setError(`File not found: ${filePath}`);
        setLoading(false);
        return;
      }

      const content = fs.readFileSync(resolvedPath, 'utf-8');
      setFileContent(content);

      // Generate documentation with AI
      const config = loadConfig();
      const aiConfig = getAIProviderConfig();
      const provider = AIProviderFactory.create(config.aiProvider, aiConfig);

      const prompt = buildDocPrompt(content, filePath || '');
      const response = await provider.generate(prompt);

      const parsed = parseDocResponse(response);
      setDoc(parsed);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  function buildDocPrompt(code: string, filename: string): string {
    return `Generate comprehensive documentation for this code file:

File: ${filename}

Code:
\`\`\`
${code}
\`\`\`

Please provide:
1. A brief summary of what this file/module does
2. A detailed description of its purpose and functionality
3. If it's a function/class: parameters with descriptions, return value, and usage examples
4. Any important notes or gotchas

Format the response as JSON with these fields:
{
  "summary": "one-line summary",
  "description": "detailed description",
  "parameters": [{"name": "param", "description": "desc"}],
  "returns": "return value description",
  "examples": ["example usage"]
}`;
  }

  function parseDocResponse(response: string): GeneratedDoc {
    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parsing fails, use fallback
    }

    // Fallback: extract sections from text
    return {
      summary: response.split('\n')[0] || 'No summary available',
      description: response.substring(0, 500),
      parameters: [],
      returns: '',
      examples: []
    };
  }

  if (loading) {
    return (
      <ChatMessage role="assistant" loading>
        <Spinner text={`Generating documentation for ${filePath}...`} />
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

  if (!doc) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <ChatMessage role="assistant">
        <Box flexDirection="column">
          <Text>Documentation for </Text>
          <Text bold color="#D4A5FF">{filePath}</Text>
          <SectionDivider />
          
          <Box marginTop={1}>
            <Text bold>Summary</Text>
            <Box marginLeft={2} marginTop={0}>
              <Text>{doc.summary}</Text>
            </Box>
          </Box>

          <Box marginTop={1}>
            <Text bold>Description</Text>
            <Box marginLeft={2} marginTop={0}>
              <Text>{doc.description}</Text>
            </Box>
          </Box>

          {doc.parameters && doc.parameters.length > 0 && (
            <Box marginTop={1}>
              <Text bold>Parameters</Text>
              <Box flexDirection="column" marginLeft={2}>
                {doc.parameters.map((param, i) => (
                  <Box key={i}>
                    <Text color="#D4A5FF">{param.name}</Text>
                    <Text>: {param.description}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {doc.returns && (
            <Box marginTop={1}>
              <Text bold>Returns</Text>
              <Box marginLeft={2}>
                <Text>{doc.returns}</Text>
              </Box>
            </Box>
          )}

          {doc.examples && doc.examples.length > 0 && (
            <Box marginTop={1}>
              <Text bold>Examples</Text>
              {doc.examples.map((example, i) => (
                <CodeBlock key={i} code={example} language="typescript" />
              ))}
            </Box>
          )}
        </Box>
      </ChatMessage>
      <StatusBar mode="doc" />
    </Box>
  );
}

export default DocGenerator;
