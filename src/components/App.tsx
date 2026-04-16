import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { GitPulseContext } from './useGitPulseApp.js';
import * as fs from 'fs';
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
import { BranchCommand } from './BranchCommand.js';
import { ReviewCommand } from './ReviewCommand.js';
import { IssuesCommand } from './IssuesCommand.js';
import { Header } from './ui.js';
import { loadConfig, getAIProviderConfig, CONFIG_FILE } from '../utils/config.js';
import { initializeCommands, hasCommand, executeCommand, CommandResult } from '../commands/index.js';
import { AccountService } from '../core/auth.js';

interface AppProps {
  command: string;
  args: string[];
  flags: {
    dryRun?: boolean;
    edit?: boolean;
    help?: boolean;
    strict?: boolean;
    lax?: boolean;
  };
}

export function App({ command, args, flags }: AppProps) {
  const [activeCommand, setActiveCommand] = useState<string>(command);
  const [activeArgs, setActiveArgs] = useState<string[]>(args);
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [ctrlCCount, setCtrlCCount] = useState(0);
  const [showExitWarning, setShowExitWarning] = useState(false);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (ctrlCCount >= 1) {
        process.exit(0);
      } else {
        setCtrlCCount(1);
        setShowExitWarning(true);
        setTimeout(() => {
          setCtrlCCount(0);
          setShowExitWarning(false);
        }, 3000);
      }
    } else {
       if (ctrlCCount > 0) {
         setCtrlCCount(0);
         setShowExitWarning(false);
       }
    }
  });

  const returnToMenu = () => {
    setActiveCommand('welcome');
    setActiveArgs([]);
  };

  useEffect(() => {
    initializeCommands();
  }, []);

  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    const config = loadConfig();
    // Check if AI provider is configured
    if (config.aiProvider === 'ollama') {
      return !!(config.ollamaHost && config.ollamaModel);
    }
    if (config.aiProvider === 'openrouter') {
      return !!config.openrouterApiKey;
    }
    return false;
  });

  const executeNewCommand = async (cmd: string, cmdArgs: string[]) => {
    if (hasCommand(cmd)) {
      setIsExecuting(true);
      setCommandResult(null);
      try {
        const result = await executeCommand(cmd, {
          args: cmdArgs,
          flags,
        });
        setCommandResult(result);
      } finally {
        setIsExecuting(false);
      }
    } else {
      setActiveCommand(cmd);
      setActiveArgs(cmdArgs);
    }
  };

  const handleCommandSelect = (cmd: string, cmdArgs: string[] = []) => {
    // Check if it's a registered command that should use the handler
    if (hasCommand(cmd)) {
      executeNewCommand(cmd, cmdArgs);
    } else {
      setActiveCommand(cmd);
      if (cmd === 'explain' || cmd === 'doc') {
        // These commands need a file argument - will handle in the component
        setActiveArgs([]);
      } else {
        setActiveArgs(cmdArgs);
      }
    }
  };

  const handleSetupComplete = () => {
    setIsConfigured(true);
  };

  const handleLogout = async () => {
    const accountService = new AccountService();
    await accountService.logout();
    setIsConfigured(false);
  };

  // Show setup if not configured
  if (!isConfigured) {
    return (
      <Box flexDirection="column" padding={1}>
        <Login onLoginComplete={handleSetupComplete} />
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

  // Command execution result component for new commands
  const renderCommandResult = () => {
    if (isExecuting) {
      return (
        <Box>
          <Text color="yellow">Executing {activeCommand}...</Text>
        </Box>
      );
    }

    if (commandResult) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text color={commandResult.success ? 'green' : 'red'}>
            {commandResult.success ? '✓' : '✗'} {activeCommand}
          </Text>
          {commandResult.message && (
            <Box marginTop={1}>
              <Text>{commandResult.message}</Text>
            </Box>
          )}
          {commandResult.error && (
            <Box marginTop={1}>
              <Text color="red">Error: {commandResult.error}</Text>
            </Box>
          )}
        </Box>
      );
    }

    return null;
  };

  // Check if current command is handled by the new command system
  const isNewCommand = hasCommand(activeCommand);

  return (
    <GitPulseContext.Provider value={{ returnToMenu, exitApp: () => process.exit(0), showExitWarning }}>
    <Box flexDirection="column" padding={1}>
      {isNewCommand ? (
        renderCommandResult()
      ) : (
        <>
          {activeCommand === 'commit' && (
            <CommitWizard 
              dryRun={flags.dryRun} 
              edit={flags.edit} 
              strict={flags.strict}
              lax={flags.lax}
            />
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

          {activeCommand === 'branch' && (
            <BranchCommand args={activeArgs} flags={flags} />
          )}

          {activeCommand === 'review' && (
            <ReviewCommand args={activeArgs} flags={flags} />
          )}

          {activeCommand === 'issues' && (
            <IssuesCommand args={activeArgs} flags={flags} />
          )}
        </>
      )}
      
      {showExitWarning && (
        <Box marginTop={1}>
          <Text color="yellow">Press Ctrl+C again to exit GitPulse</Text>
        </Box>
      )}
    </Box>
    </GitPulseContext.Provider>
  );
}

export default App;
