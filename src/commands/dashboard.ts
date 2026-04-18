import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';
import { GitOperations } from '../core/git.js';
import { getAnalytics, getRecentRuns, TelemetryRecord } from '../core/telemetry.js';
import { loadProjectConfig } from '../core/gitpulse-config.js';

interface DashboardOptions {
  port?: number;
  open?: boolean;
}

const DEFAULT_PORT = 13529; // Random port unlikely to conflict
const DASHBOARD_URL = 'http://localhost:3000/dashboard';
const AUTH_TOKEN_FILE = join(process.cwd(), '.gitpulse', '.dashboard-token');

/**
 * Generate or load authentication token for dashboard
 */
function getAuthToken(): string {
  if (existsSync(AUTH_TOKEN_FILE)) {
    return readFileSync(AUTH_TOKEN_FILE, 'utf-8').trim();
  }
  // Generate new token
  const token = randomBytes(32).toString('hex');
  writeFileSync(AUTH_TOKEN_FILE, token, { mode: 0o600 });
  return token;
}

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

  // Security: Generate auth token for this session
  const authToken = getAuthToken();

  const server = createLocalServer(repoRoot, authToken);

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

function createLocalServer(repoRoot: string, authToken: string) {
  return createServer((req, res) => {
    // Security: Restrict CORS to dashboard origin only
    const origin = req.headers.origin || '';
    const allowedOrigins = [
      'http://localhost:3000',
      'https://gitpulse.io',
      'https://app.gitpulse.io'
    ];
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Security: Validate authentication token for API endpoints
    const validateAuth = (): boolean => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      return token === authToken;
    };

    const url = new URL(req.url || '/', `http://localhost`);

    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', repo: repoRoot }));
      return;
    }

    // Telemetry API - requires authentication
    if (url.pathname === '/api/analytics') {
      // Security: Check authentication
      if (!validateAuth()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized - invalid or missing token' }));
        return;
      }

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

    // Config API - requires authentication
    if (url.pathname === '/api/config') {
      // Security: Check authentication
      if (!validateAuth()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized - invalid or missing token' }));
        return;
      }

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
