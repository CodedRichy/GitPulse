import React from 'react';
import { Box as InkBox, Text } from 'ink';

const GITPULSE_ASCII = `
   ____ _ _    ____  _   _ _   _ ____
  / ___| | |  |  _ \\| | | | | | |  _ \\
 | |  _| | |  | |_) | | | | | | | |_) |
 | |_| | | |  |  __/| |_| | |_| |  _ <
  \\____|_|_|  |_|    \\____/\\___/|_| \\_\\

           AI-Powered Git Guardrails v0.1.0
`;

const GITPULSE_MINI = `
   ____ _ _    ____  _   _ ____
  / ___| | |  |  _ \\| | | |  _ \\
 | |  _| | |  | |_) | | | | |_) |
 | |_| | | |  |  _ <| |_| |  _ <
  \\____|_|_|  |_| \\____/|_| \\_\\

        GitPulse CLI v0.1.0
`;

interface HeaderProps {
  mini?: boolean;
  subtitle?: string;
  color?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  mini = false, 
  subtitle,
  color = 'cyan'
}) => {
  return (
    <InkBox flexDirection="column" alignItems="center" marginBottom={1}>
      <Text color={color}>{mini ? GITPULSE_MINI : GITPULSE_ASCII}</Text>
      {subtitle && (
        <Text color="gray">{subtitle}</Text>
      )}
    </InkBox>
  );
};
