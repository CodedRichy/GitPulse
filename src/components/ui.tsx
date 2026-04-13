import React from 'react';
import { Box, Text, Spacer } from 'ink';

// GitPulse UI Components - Terminal UI primitives

// Header with diamond logo
export function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color="#D4A5FF">◆</Text>
        <Text bold color="#D4A5FF"> GitPulse</Text>
        <Text dimColor> v3.0</Text>
        <Spacer />
        <Text dimColor>AI-powered Git assistant</Text>
      </Box>
      <Box marginTop={0}>
        <Text dimColor>─</Text>
        <Text dimColor>────────────────────────────────────────</Text>
        <Text dimColor>─</Text>
      </Box>
    </Box>
  );
}

// Chat message bubble
interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
  loading?: boolean;
}

export function ChatMessage({ role, children, loading }: ChatMessageProps) {
  const colors = {
    user: { bg: '#2D2D2D', border: '#4A4A4A', text: 'white' },
    assistant: { bg: '#1A1A2E', border: '#D4A5FF', text: '#D4A5FF' },
    system: { bg: '#1E1E1E', border: '#6B6B6B', text: 'gray' }
  };
  
  const style = colors[role];
  
  return (
    <Box 
      flexDirection="column" 
      marginBottom={1}
      paddingX={1}
      paddingY={0}
    >
      <Box>
        <Text bold color={style.text}>
          {role === 'user' && '> '}
          {role === 'assistant' && '◆ '}
          {role === 'system' && '• '}
        </Text>
        <Text bold color={style.text}>
          {role === 'user' && 'You'}
          {role === 'assistant' && 'GitPulse'}
          {role === 'system' && 'System'}
        </Text>
        {loading && (
          <Box marginLeft={1}>
            <Text color="#D4A5FF">⏺</Text>
          </Box>
        )}
      </Box>
      <Box marginLeft={2} marginTop={0}>
        {children}
      </Box>
    </Box>
  );
}

// Status bar at bottom
interface StatusBarProps {
  branch?: string;
  ahead?: number;
  behind?: number;
  dirty?: boolean;
  mode?: string;
}

export function StatusBar({ branch, ahead, behind, dirty, mode }: StatusBarProps) {
  const branchText = branch || 'no branch';
  const aheadText = ahead && ahead > 0 ? ` ↑${ahead}` : '';
  const behindText = behind && behind > 0 ? ` ↓${behind}` : '';
  const dirtyText = dirty ? ' *' : '';
  const modeText = mode || '';
  
  return (
    <Box marginTop={1}>
      <Text color="#D4A5FF">◆</Text>
      <Text> </Text>
      <Text bold color="#D4A5FF">{branchText}</Text>
      {aheadText ? <Text color="green">{aheadText}</Text> : null}
      {behindText ? <Text color="yellow">{behindText}</Text> : null}
      {dirtyText ? <Text color="yellow">{dirtyText}</Text> : null}
      <Spacer />
      <Text dimColor>{modeText}</Text>
    </Box>
  );
}

// Code block display
interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const lines = code.split('\n').slice(0, 20);
  
  return (
    <Box 
      flexDirection="column" 
      marginY={1}
      paddingX={1}
      paddingY={0}
      borderStyle="round" 
      borderColor="#4A4A4A"
    >
      {language && (
        <Box marginBottom={0}>
          <Text dimColor>{language}</Text>
        </Box>
      )}
      {lines.map((line, i) => (
        <Box key={i}>
          <Text color="#A0A0A0">{line || ' '}</Text>
        </Box>
      ))}
      {code.split('\n').length > 20 && (
        <Box>
          <Text dimColor>... ({code.split('\n').length - 20} more lines)</Text>
        </Box>
      )}
    </Box>
  );
}

// Action button
interface ActionButtonProps {
  key: string;
  label: string;
  color?: string;
}

export function ActionButton({ key, label, color = '#D4A5FF' }: ActionButtonProps) {
  return (
    <Box marginRight={2}>
      <Text color={color} bold>[{key}]</Text>
      <Text> {label}</Text>
    </Box>
  );
}

// Loading indicator
export function Spinner({ text }: { text: string }) {
  return (
    <Box>
      <Text color="#D4A5FF">⏺</Text>
      <Text> {text}</Text>
    </Box>
  );
}

// Success checkmark
export function SuccessCheck({ text }: { text: string }) {
  return (
    <Box>
      <Text color="green">✓</Text>
      <Text> {text}</Text>
    </Box>
  );
}

// Error X
export function ErrorX({ text }: { text: string }) {
  return (
    <Box>
      <Text color="red">✗</Text>
      <Text color="red"> {text}</Text>
    </Box>
  );
}

// Section divider
export function SectionDivider({ title }: { title?: string }) {
  if (title) {
    return (
      <Box marginY={1}>
        <Text dimColor>─── {title} ───</Text>
      </Box>
    );
  }
  return (
    <Box marginY={1}>
      <Text dimColor>────────────────────────────────────────</Text>
    </Box>
  );
}

// Aliases for backward compatibility
export const ClaudeHeader = Header;
export const ClaudeSpinner = Spinner;
