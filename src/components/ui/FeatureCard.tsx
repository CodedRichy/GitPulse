import React from 'react';
import { Box as InkBox, Text } from 'ink';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  shortcut?: string;
  variant?: 'default' | 'primary' | 'success';
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon, 
  title, 
  description,
  shortcut,
  variant = 'default'
}) => {
  const colors = {
    default: 'white',
    primary: 'cyan',
    success: 'green'
  };

  return (
    <InkBox 
      flexDirection="column" 
      borderStyle="round" 
      borderColor={colors[variant]}
      paddingX={2}
      paddingY={1}
      width={30}
    >
      <InkBox flexDirection="row" gap={1} marginBottom={1}>
        <Text>{icon}</Text>
        <Text bold color={colors[variant]}>{title}</Text>
      </InkBox>
      <Text dimColor wrap="truncate-end">{description}</Text>
      {shortcut && (
        <InkBox marginTop={1}>
          <Text color="yellow">Press {shortcut}</Text>
        </InkBox>
      )}
    </InkBox>
  );
};
