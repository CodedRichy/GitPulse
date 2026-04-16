import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { GitOperations } from '../core/git.js';
import { getAnalytics, getRecentRuns, TelemetryRecord } from '../core/telemetry.js';
import { loadProjectConfig } from '../core/gitpulse-config.js';

interface DashboardOptions {
  port?: number;
  open?: boolean;
}

const DEFAULT_PORT = 13529; // Random port unlikely to conflict
const DASHBOARD_URL = 'http://localhost:3000/dashboard';

export async function dashboardCommand(options: DashboardOptions = {}): Promise<void> {
  const port = options.port || DEFAULT_PORT;
  const gitOps = new GitOperations();
  const repoRoot = await gitOps.getRepoRoot();

  // Check if in a GitPulse-enabled repo
  const configPath = join(repoRoot, '.gitpulse', 'config.json');
  if (!existsSync(configPath)) {
    console.error('❌ Not a GitPulse repository. Run "gitpulse init" first.');
    process.exit(1);
  }

  // Load config to check tier
  const config = loadProjectConfig(repoRoot);
  const tier = config.tier || 'free';

  // Free tier: show message and exit
  if (tier === 'free') {
    console.log('\n📊 GitPulse Dashboard (Pro/Team feature)\n');
    console.log('The web dashboard is available on Pro and Team tiers.');
    console.log('\nUpgrade to access:');
    console.log('  • Quality gate analytics');
    console.log('  • Commit history visualization');
    console.log('  • Custom gate configuration');
    console.log('  • Team collaboration features');
    console.log('\nRun "gitpulse upgrade" or visit https://gitpulse.io/subscription');
    process.exit(0);
  }

  // Start local server for Pro/Team
  console.log(`\n🚀 Starting GitPulse dashboard server on port ${port}...\n`);

  const server = createLocalServer(repoRoot);

  server.listen(port, () => {
    console.log(`✓ Local telemetry API: http://localhost:${port}`);
    console.log(`✓ Repository: ${repoRoot}`);
    console.log(`✓ Tier: ${tier}`);
    
    if (options.open !== false) {
      const url = `${DASHBOARD_URL}?local=${port}`;
      console.log(`\n🌐 Opening ${url}\n`);
      openBrowser(url);
    } else {
      console.log(`\n💡 Open ${DASHBOARD_URL}?local=${port} in your browser\n`);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down dashboard server...');
    server.close();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

function createLocalServer(repoRoot: string) {
  return createServer((req, res) => {
    // Enable CORS for web dashboard
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost`);

    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', repo: repoRoot }));
      return;
    }

    // Telemetry API
    if (url.pathname === '/api/analytics') {
      const days = parseInt(url.searchParams.get('days') || '30', 10);
      
      try {
        const analytics = getAnalytics(days, repoRoot);
        const recentRuns = getRecentRuns(20, repoRoot);
        const config = loadProjectConfig(repoRoot);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          analytics,
          recentRuns,
          tier: config.tier || 'pro',
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load analytics' }));
      }
      return;
    }

    // Config API
    if (url.pathname === '/api/config') {
      try {
        const config = loadProjectConfig(repoRoot);
        
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ config }));
        } else if (req.method === 'POST') {
          // In local mode, we could allow config edits
          // For now, just return success
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load config' }));
      }
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  
  try {
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' });
    } else {
      spawn(cmd, [url], { detached: true, stdio: 'ignore' });
    }
  } catch {
    console.log(`Could not open browser automatically. Please visit: ${url}`);
  }
}
