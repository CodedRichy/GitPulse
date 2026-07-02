import React from 'react';
import { Box as InkBox, Text } from 'ink';

interface StatusItem {
  icon: string;
  label: string;
  color?: string;
}

interface StatusBarProps {
  items: StatusItem[];
  variant?: 'default' | 'compact';
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  items,
  variant = 'default'
}) => {
  if (variant === 'compact') {
    return (
      <InkBox 
        flexDirection="row" 
        justifyContent="space-between"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginTop={1}
      >
        {items.map((item, i) => (
          <Text key={i} color={item.color || 'white'}>
            {item.icon} {item.label}
          </Text>
        ))}
      </InkBox>
    );
  }

  return (
    <InkBox 
      flexDirection="row" 
      justifyContent="space-around"
      borderStyle="single"
      borderColor="gray"
      paddingX={2}
      paddingY={1}
      marginTop={1}
    >
      {items.map((item, i) => (
        <InkBox key={i} flexDirection="column" alignItems="center">
          <Text color={item.color || 'white'}>{item.icon}</Text>
          <Text dimColor>{item.label}</Text>
        </InkBox>
      ))}
    </InkBox>
  );
};

// Preset status configurations
export const createGitStatusBar = (
  branch: string, 
  ahead: number, 
  behind: number, 
  score: number,
  provider: string,
  mode: string = 'ready'
) => {
  return [
    { icon: '🌿', label: branch, color: 'green' },
    { icon: '⬆️', label: ahead > 0 ? `${ahead}` : '-', color: ahead > 0 ? 'cyan' : 'gray' },
    { icon: '⬇️', label: behind > 0 ? `${behind}` : '-', color: behind > 0 ? 'yellow' : 'gray' },
    { icon: '🛡️', label: `${score}/100`, color: score > 80 ? 'green' : score > 60 ? 'yellow' : 'red' },
    { icon: '⚡', label: provider, color: 'cyan' },
    { icon: '●', label: mode, color: 'green' }
  ];
};
