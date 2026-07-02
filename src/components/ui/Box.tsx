import React from 'react';
import { Box as InkBox, Text } from 'ink';

interface BoxProps {
  title?: string;
  width?: number;
  height?: number;
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  padding?: number;
  marginTop?: number;
  marginBottom?: number;
}

const colors = {
  default: 'white',
  primary: 'cyan',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue'
};

export const Box: React.FC<BoxProps> = ({ 
  title, 
  width = 60, 
  height,
  children, 
  variant = 'default',
  padding = 1,
  marginTop = 0,
  marginBottom = 0
}) => {
  const color = colors[variant];
  
  return (
    <InkBox 
      flexDirection="column" 
      marginTop={marginTop}
      marginBottom={marginBottom}
    >
      <Text color={color}>╭{'─'.repeat(width - 2)}╮</Text>
      
      {title && (
        <>
          <InkBox flexDirection="row">
            <Text color={color}>│ </Text>
            <Text bold color={color}>{title.slice(0, width - 4).padEnd(width - 4)}</Text>
            <Text color={color}> │</Text>
          </InkBox>
          <Text color={color}>├{'─'.repeat(width - 2)}┤</Text>
        </>
      )}
      
      <InkBox paddingLeft={padding} paddingRight={padding}>
        {children}
      </InkBox>
      
      {height && Array.from({ length: height }).map((_, i) => (
        <InkBox key={i} flexDirection="row" paddingLeft={padding} paddingRight={padding}>
          <Text>{' '.repeat(width - padding * 2 - 2)}</Text>
        </InkBox>
      ))}
      
      <Text color={color}>╰{'─'.repeat(width - 2)}╯</Text>
    </InkBox>
  );
};
