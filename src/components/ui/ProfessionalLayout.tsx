import React from 'react';
import { Box, Text } from 'ink';

interface LayoutProps {
  children: React.ReactNode;
  width?: number;
  showBorder?: boolean;
}

const DEFAULT_WIDTH = 80;

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  width = DEFAULT_WIDTH,
  showBorder = true 
}) => {
  if (!showBorder) {
    return (
      <Box flexDirection="column" width={width}>
        {children}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width}>
      <Text color="gray">╭{'─'.repeat(width - 2)}╮</Text>
      <Box paddingX={1} width={width - 2}>
        {children}
      </Box>
      <Text color="gray">╰{'─'.repeat(width - 2)}╯</Text>
    </Box>
  );
};

export const Separator: React.FC<{ width?: number; char?: string; color?: string }> = ({ 
  width = DEFAULT_WIDTH - 4, 
  char = '─',
  color = 'gray'
}) => (
  <Text color={color}>{char.repeat(width)}</Text>
);

export const StatusLine: React.FC<{ items: { label: string; value: string; color?: string }[] }> = ({ items }) => (
  <Box flexDirection="row" gap={4}>
    {items.map((item, i) => (
      <Box key={i} flexDirection="row" gap={1}>
        <Text dimColor>{item.label}:</Text>
        <Text color={item.color || 'white'}>{item.value}</Text>
      </Box>
    ))}
  </Box>
);

export const ToolItem: React.FC<{ icon: string; name: string; shortcut?: string; desc: string }> = ({ 
  icon, name, shortcut, desc 
}) => (
  <Box flexDirection="row" gap={1}>
    <Text>{icon}</Text>
    <Text bold color="cyan">{name}</Text>
    {shortcut && <Text color="gray">({shortcut})</Text>}
    <Text dimColor>— {desc}</Text>
  </Box>
);

export const ToolList: React.FC<{ tools: { icon: string; name: string; shortcut?: string; desc: string }[] }> = ({ tools }) => (
  <Box flexDirection="column" gap={1}>
    {tools.map((tool, i) => (
      <ToolItem key={i} {...tool} />
    ))}
  </Box>
);

export const CommandPrompt: React.FC<{ placeholder?: string }> = ({ placeholder = "Type command..." }) => (
  <Box flexDirection="row">
    <Text bold color="white">❯ </Text>
    <Text color="gray">{placeholder}</Text>
    <Box>
      <Text color="white">_</Text>
    </Box>
  </Box>
);

export const Footer: React.FC<{ left?: string; right?: string }> = ({ 
  left = "Press ? for help", 
  right = "Ctrl+C to quit" 
}) => (
  <Box flexDirection="row" justifyContent="space-between">
    <Text dimColor>{left}</Text>
    <Text dimColor>{right}</Text>
  </Box>
);
