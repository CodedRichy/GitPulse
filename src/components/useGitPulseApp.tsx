import { useContext, createContext } from 'react';
import { useApp } from 'ink';

export const GitPulseContext = createContext<{ returnToMenu: () => void; exitApp: () => void }>({
  returnToMenu: () => {
    process.exit(0);
  },
  exitApp: () => {
    process.exit(0);
  }
});

export function useGitPulseApp() {
  const inkApp = useApp();
  const { returnToMenu } = useContext(GitPulseContext);
  
  return {
    ...inkApp,
    exit: returnToMenu,
  };
}
