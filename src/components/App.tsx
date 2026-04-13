import React, { useState } from 'react';
import { Box } from 'ink';
import { CommitWizard } from './CommitWizard.js';
import { StatusPanel } from './StatusPanel.js';
import { ConfigPanel } from './ConfigPanel.js';
import { ExplainView } from './ExplainView.js';
import { PRGenerator } from './PRGenerator.js';
import { DocGenerator } from './DocGenerator.js';
import { Analyzer } from './Analyzer.js';
import { Welcome } from './Welcome.js';
import { UndoRedo } from './UndoRedo.js';
import { Login } from './Login.js';
import { Header } from './ui.js';
import { loadConfig, getAIProviderConfig } from '../utils/config.js';

interface AppProps {
  command: string;
  args: string[];
  flags: {
    dryRun?: boolean;
    edit?: boolean;
    help?: boolean;
  };
}

export function App({ command, args, flags }: AppProps) {
  const [activeCommand, setActiveCommand] = useState<string>(command);
  const [activeArgs, setActiveArgs] = useState<string[]>(args);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const config = loadConfig();
    const aiConfig = getAIProviderConfig();
    // Check if user has configured an AI provider with valid credentials
    if (config.aiProvider === 'openrouter' && aiConfig.openrouterApiKey) {
      return true;
    }
    if (config.aiProvider === 'ollama') {
      return true; // Ollama is local, assume available
    }
    return false;
  });

  const handleCommandSelect = (cmd: string) => {
    setActiveCommand(cmd);
    if (cmd === 'explain' || cmd === 'doc') {
      // These commands need a file argument - will handle in the component
      setActiveArgs([]);
    } else {
      setActiveArgs([]);
    }
  };

  const handleLoginComplete = () => {
    setIsAuthenticated(true);
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <Box flexDirection="column" padding={1}>
        <Login onLoginComplete={handleLoginComplete} />
      </Box>
    );
  }

  // If no command provided, show welcome screen
  if (!activeCommand || activeCommand === 'welcome') {
    return (
      <Box flexDirection="column" padding={1}>
        <Welcome onCommandSelect={handleCommandSelect} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      
      {activeCommand === 'commit' && (
        <CommitWizard dryRun={flags.dryRun} edit={flags.edit} />
      )}
      
      {activeCommand === 'status' && (
        <StatusPanel />
      )}
      
      {activeCommand === 'doc' && (
        <DocGenerator filePath={activeArgs[0]} />
      )}
      
      {activeCommand === 'analyze' && (
        <Analyzer targetPath={activeArgs[0]} />
      )}
      
      {activeCommand === 'config' && (
        <ConfigPanel args={activeArgs} />
      )}
      
      {activeCommand === 'explain' && (
        <ExplainView filePath={activeArgs[0]} />
      )}
      
      {activeCommand === 'pr' && (
        <PRGenerator dryRun={flags.dryRun} />
      )}
      
      {activeCommand === 'undo' && (
        <UndoRedo action="undo" />
      )}
      
      {activeCommand === 'redo' && (
        <UndoRedo action="redo" />
      )}
    </Box>
  );
}

export default App;
