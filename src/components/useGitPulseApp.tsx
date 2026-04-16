import { useContext, createContext } from 'react';
import { useApp } from 'ink';

export const GitPulseContext = createContext<{ returnToMenu: () => void; exitApp: () => void; showExitWarning?: boolean }>({
  returnToMenu: () => {
    process.exit(0);
  },
  exitApp: () => {
    process.exit(0);
  },
  showExitWarning: false
});

export function useGitPulseApp() {
  const inkApp = useApp();
  const { returnToMenu, showExitWarning } = useContext(GitPulseContext);
  
  return {
    ...inkApp,
    exit: returnToMenu,
    showExitWarning,
  };
}
