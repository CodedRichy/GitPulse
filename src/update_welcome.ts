import * as fs from 'fs';
import * as path from 'path';

const filePath = 'c:/Users/rishi/Documents/GitHub/GitPulse/src/components/Welcome.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the start of the return statement using regex to handle \r\n vs \n
const returnMatch = content.match(/  return \(\s*<Box flexDirection="column">/);
if (!returnMatch) {
  console.error("Could not find start of return statement!");
  process.exit(1);
}
const returnIndex = returnMatch.index;

const newReturn = `  return (
    <Box flexDirection="column" paddingLeft={1}>
      {/* Header Info */}
      {!showCommands && !showModelSelector && input.length === 0 && (
        <Box marginBottom={1} flexDirection="column">
          <Text dimColor>
            GitPulse <Text color="gray">v3.0</Text> • Repository: {repoInfo ? \`\${repoInfo.name} (\${repoInfo.branch})\` : 'None'} • AI: {currentModel.split('/').pop() || currentModel}
          </Text>
        </Box>
      )}

      {/* Main REPL Area */}
      <Box flexDirection="column">
        
        {/* Model Selector */}
        {showModelSelector ? (
          <Box flexDirection="column" marginBottom={1}>
            <Text dimColor>Select AI Model:</Text>
            {dynamicModelOptions.map((option, index) => (
              <Box key={option.alias}>
                <Text color={selectedModelIndex === index ? 'white' : 'gray'} bold={selectedModelIndex === index}>
                  {selectedModelIndex === index ? '❯ ' : '  '}
                  {option.alias}
                </Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Box flexDirection="column">
            {/* Input Prompt */}
            <Box flexDirection="row" alignItems="center">
              <Text color={showCommands ? "cyan" : "gray"} bold>◆ </Text>
              {!showCommands && input.length === 0 ? (
                 <Text dimColor>Type / for commands, or type normally...</Text>
              ) : (
                 <TextInput 
                   value={input} 
                   onChange={setInput}
                   showCursor={true}
                   focus={true}
                 />
              )}
            </Box>
            
            {/* Suggestions */}
            {showCommands && filteredCommands.length > 0 && (
              <Box flexDirection="column" marginTop={1} marginLeft={2}>
                {filteredCommands.slice(0, 5).map((cmd, index) => (
                  <Box key={cmd.name}>
                    <Text color={selectedIndex === index ? "white" : "gray"} bold={selectedIndex === index}>
                      {selectedIndex === index ? '❯ ' : '  '}{cmd.name}
                    </Text>
                    <Text dimColor> — {cmd.desc}</Text>
                  </Box>
                ))}
              </Box>
            )}
            
            {showCommands && filteredCommands.length === 0 && input.length > 1 && (
              <Box marginTop={1} marginLeft={2}>
                <Text color="red">No commands found</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Hidden status bar logic could remain if needed, but we wanted a clean UI */}
    </Box>
  );
}

export default Welcome;
`;

// replace from returnIndex to end of file
const updatedContent = content.substring(0, returnIndex) + newReturn;
fs.writeFileSync(filePath, updatedContent);
console.log("Updated Welcome.tsx");
