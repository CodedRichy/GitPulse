import React from 'react';
import { Box as InkBox, Text } from 'ink';

interface Tool {
  icon: string;
  name: string;
  shortcut?: string;
  description: string;
}

interface ToolGridProps {
  tools: Tool[];
  columns?: number;
}

export const ToolGrid: React.FC<ToolGridProps> = ({ tools, columns = 2 }) => {
  const colWidth = 38;
  
  return (
    <InkBox flexDirection="column">
      {Array.from({ length: Math.ceil(tools.length / columns) }).map((_, rowIdx) => (
        <InkBox key={rowIdx} flexDirection="row">
          {tools.slice(rowIdx * columns, (rowIdx + 1) * columns).map((tool, colIdx) => (
            <InkBox key={colIdx} width={colWidth} paddingRight={2}>
              <Text>
                <Text color="cyan">{tool.icon}</Text>
                {' '}
                <Text bold>{tool.name}</Text>
                {tool.shortcut && (
                  <Text color="gray"> ({tool.shortcut})</Text>
                )}
              </Text>
              <Text dimColor wrap="truncate">  {tool.description}</Text>
            </InkBox>
          ))}
        </InkBox>
      ))}
    </InkBox>
  );
};
