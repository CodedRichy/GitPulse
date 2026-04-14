#!/usr/bin/env node
import { GitPulseMCPServer } from './server.js';

async function main() {
  const server = new GitPulseMCPServer();
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
