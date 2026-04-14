import React, { useState, useEffect } from 'react';
import {  Box, Text, useApp, useInput  } from "ink";
import { useGitPulseApp } from "./useGitPulseApp.js";;
import { analyzeDirectory, analyzeFile } from '../core/analyzer.js';
import { FileAnalysis, FunctionInfo } from '../core/models.js';
import { ChatMessage, StatusBar, Spinner, SectionDivider, SuccessCheck } from './ui.js';
import * as fs from 'fs';
import * as path from 'path';

interface AnalyzerProps {
  targetPath?: string;
}

export function Analyzer({ targetPath }: AnalyzerProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<'scanning' | 'analyzing' | 'results' | 'error'>('scanning');
  const [error, setError] = useState<string>('');
  const [results, setResults] = useState<{
    files: FileAnalysis[];
    overallCoverage: number;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'summary' | 'files' | 'undocumented'>('summary');

  useEffect(() => {
    runAnalysis();
  }, []);

  useInput((input) => {
    if (step !== 'results' || !results) return;

    switch (input) {
      case 'q':
      case 'Q':
        exit();
        break;
      case 's':
      case 'S':
        setViewMode('summary');
        break;
      case 'f':
      case 'F':
        setViewMode('files');
        break;
      case 'u':
      case 'U':
        setViewMode('undocumented');
        break;
      case 'j':
      case 'J':
        if (viewMode === 'files' || viewMode === 'undocumented') {
          const maxIndex = viewMode === 'files' ? results.files.length - 1 : getAllUndocumented(results.files).length - 1;
          setSelectedFile(prev => Math.min(prev + 1, maxIndex));
        }
        break;
      case 'k':
      case 'K':
        if (viewMode === 'files' || viewMode === 'undocumented') {
          setSelectedFile(prev => Math.max(prev - 1, 0));
        }
        break;
    }
  });

  async function runAnalysis() {
    try {
      const target = targetPath || '.';
      const fullPath = path.resolve(target);

      if (!fs.existsSync(fullPath)) {
        setError(`Path not found: ${target}`);
        setStep('error');
        return;
      }

      setStep('analyzing');

      let analysis: { files: FileAnalysis[]; overallCoverage: number };

      if (fs.statSync(fullPath).isFile()) {
        const fileAnalysis = analyzeFile(fullPath);
        analysis = {
          files: [fileAnalysis],
          overallCoverage: fileAnalysis.documentationCoverage
        };
      } else {
        analysis = analyzeDirectory(fullPath, {
          include: ['.ts', '.tsx', '.js', '.jsx'],
          exclude: ['node_modules', 'dist', 'build', '.git']
        });
      }

      setResults(analysis);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }

  function getAllUndocumented(files: FileAnalysis[]): { file: FileAnalysis; func: FunctionInfo }[] {
    const undocumented: { file: FileAnalysis; func: FunctionInfo }[] = [];
    for (const file of files) {
      for (const func of file.undocumentedFunctions) {
        undocumented.push({ file, func });
      }
    }
    return undocumented;
  }

  if (step === 'scanning' || step === 'analyzing') {
    return (
      <ChatMessage role="assistant" loading>
        <Spinner text={step === 'scanning' ? 'Scanning repository...' : 'Analyzing code and documentation coverage...'} />
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

  if (!results) return null;

  const totalFiles = results.files.length;
  const totalFunctions = results.files.reduce((sum, f) => sum + f.functions.length, 0);
  const documentedFunctions = totalFunctions - results.files.reduce((sum, f) => sum + f.undocumentedFunctions.length, 0);
  const undocumentedList = getAllUndocumented(results.files);

  return (
    <Box flexDirection="column">
      <ChatMessage role="assistant">
        <Box flexDirection="column">
          <Text bold>Documentation Analysis</Text>
          <SectionDivider />

          {viewMode === 'summary' && (
            <>
              <Box marginTop={1}>
                <Text bold color="#D4A5FF">Coverage Overview</Text>
                <Box marginLeft={2} flexDirection="column">
                  <Text>Files analyzed: <Text bold>{totalFiles}</Text></Text>
                  <Text>Total functions: <Text bold>{totalFunctions}</Text></Text>
                  <Text>Documented: <Text bold color="#50FA7B">{documentedFunctions}</Text></Text>
                  <Text>Undocumented: <Text bold color={undocumentedList.length > 0 ? '#FF5555' : '#50FA7B'}>{undocumentedList.length}</Text></Text>
                  <Box marginTop={1}>
                    <Text>Overall coverage: </Text>
                    <Text 
                      bold 
                      color={results.overallCoverage >= 80 ? '#50FA7B' : results.overallCoverage >= 50 ? '#F1FA8C' : '#FF5555'}
                    >
                      {results.overallCoverage.toFixed(1)}%
                    </Text>
                  </Box>
                </Box>
              </Box>

              {results.overallCoverage < 80 && (
                <Box marginTop={1}>
                  <Text color="#F1FA8C">⚠ Coverage below 80%. Consider documenting more functions.</Text>
                </Box>
              )}

              <SectionDivider />
              
              <Box marginTop={1}>
                <Text dimColor>Press <Text bold color="#D4A5FF">F</Text> to view files, <Text bold color="#D4A5FF">U</Text> for undocumented functions, <Text bold color="#D4A5FF">Q</Text> to quit</Text>
              </Box>
            </>
          )}

          {viewMode === 'files' && (
            <>
              <Box marginTop={1}>
                <Text bold color="#D4A5FF">File Coverage</Text>
                <Box marginTop={1} flexDirection="column">
                  {results.files.slice(0, 15).map((file, i) => (
                    <Box key={i}>
                      <Text color={i === selectedFile ? '#D4A5FF' : undefined}>{i === selectedFile ? '>' : ' '}</Text>
                      <Text 
                        color={
                          file.documentationCoverage >= 80 ? '#50FA7B' : 
                          file.documentationCoverage >= 50 ? '#F1FA8C' : 
                          '#FF5555'
                        }
                      >
                        {file.documentationCoverage.toFixed(0)}% {file.path}
                      </Text>
                    </Box>
                  ))}
                  {results.files.length > 15 && (
                    <Text dimColor>... and {results.files.length - 15} more files</Text>
                  )}
                </Box>
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Use <Text bold>J/K</Text> to navigate, <Text bold>S</Text> for summary, <Text bold>Q</Text> to quit</Text>
              </Box>
            </>
          )}

          {viewMode === 'undocumented' && (
            <>
              <Box marginTop={1}>
                <Text bold color="#FF5555">Undocumented Functions ({undocumentedList.length})</Text>
                <Box marginTop={1} flexDirection="column">
                  {undocumentedList.slice(0, 20).map((item, i) => (
                    <Box key={i}>
                      <Text color={i === selectedFile ? '#D4A5FF' : undefined}>{i === selectedFile ? '>' : ' '}</Text>
                      <Text color="#A0A0A0">{item.file.path}:{item.func.line}</Text>
                      <Text> {item.func.name}({item.func.params.join(', ')})</Text>
                    </Box>
                  ))}
                  {undocumentedList.length > 20 && (
                    <Text dimColor>... and {undocumentedList.length - 20} more</Text>
                  )}
                </Box>
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Use <Text bold>J/K</Text> to navigate, <Text bold>S</Text> for summary, <Text bold>Q</Text> to quit</Text>
              </Box>
            </>
          )}
        </Box>
      </ChatMessage>
      <StatusBar mode="review" />
    </Box>
  );
}

export default Analyzer;
