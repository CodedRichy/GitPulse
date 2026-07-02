import React from 'react';
import { Box as InkBox, Text } from 'ink';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  trend,
  trendDirection = 'neutral',
  variant = 'default'
}) => {
  const trendColors = {
    up: 'green',
    down: 'red',
    neutral: 'gray'
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };

  return (
    <InkBox 
      flexDirection="column" 
      borderStyle="single" 
      borderColor="gray"
      paddingX={2}
      paddingY={1}
      width={20}
    >
      <Text dimColor>{label}</Text>
      <Text bold color={variant === 'default' ? 'white' : variant}>{value}</Text>
      {trend && (
        <Text color={trendColors[trendDirection]}>
          {trendIcons[trendDirection]} {trend}
        </Text>
      )}
    </InkBox>
  );
};
