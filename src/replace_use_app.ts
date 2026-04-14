import * as fs from 'fs';
import * as path from 'path';

const componentsDir = 'c:/Users/rishi/Documents/GitHub/GitPulse/src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx') && f !== 'App.tsx' && f !== 'useGitPulseApp.tsx');

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import
  content = content.replace(/import\s+\{([^}]*)useApp([^}]*)\}\s+from\s+['"]ink['"]/g, 'import { $1useApp$2 } from "ink";\nimport { useGitPulseApp } from "./useGitPulseApp.js";');
  
  // Actually wait, sometimes it's import { Box, useApp } from 'ink'.
  // Better replacement logic:
  if (content.includes('useApp') && !content.includes('useGitPulseApp')) {
      content = content.replace(/useApp\(\)/g, "useGitPulseApp()");
      content = "import { useGitPulseApp } from './useGitPulseApp.js';\n" + content;
  }
  
  fs.writeFileSync(filePath, content);
}
console.log('Replaced useApp with useGitPulseApp in components');
