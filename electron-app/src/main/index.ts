import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import Store = require('electron-store');

// Load environment variables from .env file
import { config } from 'dotenv';
config({ path: path.join(__dirname, '../../.env') });

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pythonProcess: ChildProcess | null = null;

const isDev = !app.isPackaged;

async function resolveDevServerUrl(): Promise<string | null> {
  const targetUrl = 'http://localhost:5173';

  const start = Date.now();
  const timeoutMs = 15000;

  while (Date.now() - start < timeoutMs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 500);
      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        return targetUrl;
      }
    } catch {
      // Wait for renderer dev server to become available
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return null;
}

// Add isQuitting property to app
let isQuitting = false;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e293b',
      symbolColor: '#ffffff',
      height: 32,
    },
    show: false,
  });

  if (isDev) {
    const devServerUrl = await resolveDevServerUrl();
    if (devServerUrl) {
      console.log(`[Electron] Loading renderer from ${devServerUrl}`);
      await mainWindow.loadURL(devServerUrl);
    } else {
      console.log('[Electron] Dev server not found, falling back to built renderer file');
      const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
      await mainWindow.loadFile(rendererPath);
    }
    if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
    await mainWindow.loadFile(rendererPath);
  }

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  if (isDev) {
    mainWindow.show();
    mainWindow.focus();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, '../../assets/tray-icon.png')
  );
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show GitPulse',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Start Monitoring',
      click: () => {
        startPythonBackend();
      },
    },
    {
      label: 'Stop Monitoring',
      click: () => {
        stopPythonBackend();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('GitPulse - AI Git Automation');
  
  tray.on('click', () => {
    mainWindow?.show();
  });
}

function startPythonBackend() {
  if (pythonProcess) {
    return; // Already running
  }

  const pythonPath = isDev
    ? path.join(__dirname, '../../../git-pulse.py')
    : path.join(process.resourcesPath, 'git-pulse.py');

  pythonProcess = spawn('python', [pythonPath, '--cli'], {
    cwd: path.dirname(pythonPath),
  });

  pythonProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    console.log('[Python]', output);
    mainWindow?.webContents.send('python-output', output);
    
    // Parse output for pipeline events
    parsePythonOutput(output);
  });

  pythonProcess.stderr?.on('data', (data) => {
    console.error('[Python Error]', data.toString());
    mainWindow?.webContents.send('python-error', data.toString());
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Python] Process exited with code ${code}`);
    pythonProcess = null;
    mainWindow?.webContents.send('python-stopped', code);
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// IPC Handlers
ipcMain.handle('get-analytics', async () => {
  // Call Python backend API
  try {
    const response = await fetch('http://127.0.0.1:5000/api/analytics/summary');
    return await response.json();
  } catch (error) {
    return { error: 'Failed to fetch analytics' };
  }
});

ipcMain.handle('get-repositories', async () => {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/analytics/repos');
    return await response.json();
  } catch (error) {
    return { error: 'Failed to fetch repositories' };
  }
});

ipcMain.handle('get-github-repositories', async () => {
  const token = store.get('github_token');

  if (typeof token !== 'string' || !token.trim()) {
    return { error: 'GitHub account is not linked.' };
  }

  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (response.status === 401) {
      store.delete('github_token');
      return { error: 'GitHub session expired. Please reconnect your account.' };
    }

    if (!response.ok) {
      return { error: 'Failed to fetch repositories from GitHub.' };
    }

    const repos = (await response.json()) as any[];

    const mapped = repos.reduce((acc: Record<string, any>, repo: any) => {
      const hasRecentActivity = Boolean(repo.pushed_at);
      const status = hasRecentActivity ? 'watching' : 'idle';
      const riskLevel = repo.archived ? 'high' : repo.private ? 'medium' : 'low';
      const confidence = riskLevel === 'low' ? 92 : riskLevel === 'medium' ? 78 : 61;

      acc[repo.full_name || repo.name] = {
        commits: 0,
        pushes: 0,
        errors: 0,
        last_push: repo.pushed_at || undefined,
        last_commit: repo.updated_at || undefined,
        last_activity: repo.pushed_at || repo.updated_at || undefined,
        status,
        risk_level: riskLevel,
        confidence,
        local_path: '', // Will be set when user selects local repo
      };
      return acc;
    }, {});

    return mapped;
  } catch {
    return { error: 'Network error while fetching GitHub repositories.' };
  }
});

ipcMain.handle('get-config', async () => {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/config');
    return await response.json();
  } catch (error) {
    return { error: 'Failed to fetch config' };
  }
});

ipcMain.handle('update-config', async (_, config) => {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await response.json();
  } catch (error) {
    return { error: 'Failed to update config' };
  }
});

ipcMain.handle('start-monitoring', () => {
  startPythonBackend();
  return { success: true };
});

ipcMain.handle('stop-monitoring', () => {
  stopPythonBackend();
  return { success: true };
});

ipcMain.handle('get-github-token', () => {
  const token = store.get('github_token');
  return typeof token === 'string' ? token : null;
});

ipcMain.handle('set-github-token', (_, token) => {
  if (typeof token !== 'string') {
    return { success: false, error: 'Token must be a string' };
  }

  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return { success: false, error: 'Token cannot be empty' };
  }

  store.set('github_token', trimmedToken);
  return { success: true };
});

ipcMain.handle('clear-github-token', () => {
  store.delete('github_token');
  return { success: true };
});

ipcMain.handle('open-external-url', async (_, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    return { success: false, error: 'Invalid URL' };
  }

  await shell.openExternal(url);
  return { success: true };
});

ipcMain.handle('start-github-device-flow', async () => {
  let clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  
  // Fallback: read .env file directly if env var is missing
  if (!clientId) {
    try {
      const fs = require('fs');
      const envPath = path.join(__dirname, '../../../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^GITHUB_OAUTH_CLIENT_ID=(.+)$/m);
        if (match && match[1]) {
          clientId = match[1].trim();
        }
      }
    } catch {
      // ignore read errors
    }
  }
  
  if (!clientId) {
    return {
      success: false,
      error: 'Missing GITHUB_OAUTH_CLIENT_ID in environment.',
    };
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      scope: 'repo read:user',
    });

    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data: any = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error_description || 'Failed to start GitHub sign-in.',
      };
    }

    return {
      success: true,
      data: {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        expiresIn: data.expires_in,
        interval: data.interval,
      },
    };
  } catch {
    return { success: false, error: 'Network error while starting GitHub sign-in.' };
  }
});

ipcMain.handle('poll-github-device-flow', async (_, deviceCode) => {
  if (typeof deviceCode !== 'string' || !deviceCode.trim()) {
    return { success: false, status: 'error', error: 'Invalid device code.' };
  }

  let clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  
  // Fallback: read .env file directly if env var is missing
  if (!clientId) {
    try {
      const fs = require('fs');
      const envPath = path.join(__dirname, '../../../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^GITHUB_OAUTH_CLIENT_ID=(.+)$/m);
        if (match && match[1]) {
          clientId = match[1].trim();
        }
      }
    } catch {
      // ignore read errors
    }
  }
  
  if (!clientId) {
    return {
      success: false,
      status: 'error',
      error: 'Missing GITHUB_OAUTH_CLIENT_ID in environment.',
    };
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data: any = await response.json();

    if (data.error === 'authorization_pending') {
      return { success: false, status: 'pending' };
    }

    if (data.error === 'slow_down') {
      return { success: false, status: 'slow_down' };
    }

    if (data.error === 'expired_token') {
      return { success: false, status: 'expired', error: 'GitHub sign-in code expired. Please retry.' };
    }

    if (data.error === 'access_denied') {
      return { success: false, status: 'denied', error: 'GitHub sign-in was canceled.' };
    }

    if (!response.ok || data.error || !data.access_token) {
      return {
        success: false,
        status: 'error',
        error: data.error_description || 'Failed to complete GitHub sign-in.',
      };
    }

    return {
      success: true,
      accessToken: data.access_token,
    };
  } catch {
    return { success: false, status: 'error', error: 'Network error while completing GitHub sign-in.' };
  }
});

// Notifications and pipeline events
ipcMain.handle('mark-notification-read', (_, id) => {
  const notifications = store.get('notifications', []) as any[];
  const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  store.set('notifications', updated);
  return { success: true };
});

ipcMain.handle('clear-all-notifications', () => {
  store.set('notifications', []);
  return { success: true };
});

ipcMain.handle('get-notifications', () => {
  return store.get('notifications', []);
});

ipcMain.handle('get-pipeline-events', () => {
  return store.get('pipeline_events', []);
});

// Git operations
ipcMain.handle('get-git-diff', async (_, repoPath) => {
  if (typeof repoPath !== 'string' || !repoPath.trim()) {
    return { error: 'Invalid repository path' };
  }
  
  try {
    const { execSync } = require('child_process');
    const diff = execSync('git diff', { 
      cwd: repoPath, 
      encoding: 'utf-8',
      timeout: 10000 
    });
    return { success: true, diff };
  } catch (error: any) {
    // No changes or not a git repo
    if (error.status === 1 && error.stdout) {
      return { success: true, diff: error.stdout };
    }
    return { error: 'Failed to get git diff: ' + error.message };
  }
});

ipcMain.handle('get-git-status', async (_, repoPath) => {
  if (typeof repoPath !== 'string' || !repoPath.trim()) {
    return { error: 'Invalid repository path' };
  }
  
  try {
    const { execSync } = require('child_process');
    const status = execSync('git status --porcelain', { 
      cwd: repoPath, 
      encoding: 'utf-8',
      timeout: 5000 
    });
    
    const files = status.split('\n').filter((line: string) => line.trim()).map((line: string) => ({
      status: line.substring(0, 2).trim(),
      file: line.substring(3).trim(),
    }));
    
    return { success: true, files };
  } catch (error: any) {
    return { error: 'Failed to get git status: ' + error.message };
  }
});

ipcMain.handle('generate-commit-message', async (_, { repoPath, diff }) => {
  if (!repoPath || !diff) {
    return { error: 'Repository path and diff are required' };
  }
  
  // Call Python backend to generate commit message
  try {
    const response = await fetch('http://127.0.0.1:5000/api/generate-commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_path: repoPath, diff }),
    });
    
    if (!response.ok) {
      return { error: 'Failed to generate commit message' };
    }
    
    const data: any = await response.json();
    return { success: true, message: data.message, risk: data.risk, confidence: data.confidence };
  } catch {
    // Fallback: return a basic message
    const files = diff.split('\n')
      .filter((line: string) => line.startsWith('diff --git'))
      .map((line: string) => line.split(' ')[2].replace('a/', ''))
      .slice(0, 3);
    
    return { 
      success: true, 
      message: `feat: update ${files.join(', ')}`,
      risk: 'low',
      confidence: 75
    };
  }
});

// Commit and push operations
ipcMain.handle('commit-changes', async (_, { repoPath, message }) => {
  if (!repoPath || !message) {
    return { error: 'Repository path and commit message are required' };
  }
  
  try {
    const { spawnSync } = require('child_process');
    
    // Stage all changes
    const addResult = spawnSync('git', ['add', '-A'], { 
      cwd: repoPath, 
      encoding: 'utf-8',
      timeout: 5000 
    });
    if (addResult.status !== 0) {
      throw new Error(addResult.stderr || 'git add failed');
    }
    
    // Create commit
    const commitResult = spawnSync('git', ['commit', '-m', message], { 
      cwd: repoPath, 
      encoding: 'utf-8',
      timeout: 10000 
    });
    if (commitResult.status !== 0) {
      throw new Error(commitResult.stderr || 'git commit failed');
    }
    const commitOutput = commitResult.stdout;
    
    broadcastPipelineEvent({
      id: `commit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      step: 'commit_generated',
      status: 'done',
      message: `Committed: ${message}`,
    });
    
    return { success: true, output: commitOutput };
  } catch (error: any) {
    return { error: 'Failed to commit: ' + error.message };
  }
});

ipcMain.handle('push-changes', async (_, repoPath) => {
  if (!repoPath) {
    return { error: 'Repository path is required' };
  }
  
  try {
    const { execSync } = require('child_process');
    
    broadcastPipelineEvent({
      id: `push-${Date.now()}`,
      timestamp: new Date().toISOString(),
      step: 'push_queued',
      status: 'pending',
      message: 'Pushing to remote...',
    });
    
    const pushOutput = execSync('git push', { 
      cwd: repoPath, 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    broadcastPipelineEvent({
      id: `push-${Date.now()}`,
      timestamp: new Date().toISOString(),
      step: 'push_completed',
      status: 'done',
      message: 'Push completed',
    });
    
    broadcastNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'success',
      message: 'Changes pushed to remote',
      read: false,
    });
    
    return { success: true, output: pushOutput };
  } catch (error: any) {
    broadcastPipelineEvent({
      id: `push-${Date.now()}`,
      timestamp: new Date().toISOString(),
      step: 'push_failed',
      status: 'failed',
      message: error.message,
    });
    
    broadcastNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'error',
      message: 'Push failed: ' + error.message,
      read: false,
    });
    
    return { error: 'Failed to push: ' + error.message };
  }
});

ipcMain.handle('discard-changes', async (_, repoPath) => {
  if (!repoPath) {
    return { error: 'Repository path is required' };
  }
  
  try {
    const { execSync } = require('child_process');
    execSync('git checkout -- .', { cwd: repoPath, timeout: 5000 });
    execSync('git clean -fd', { cwd: repoPath, timeout: 5000 });
    
    broadcastNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: 'Changes discarded',
      read: false,
    });
    
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to discard: ' + error.message };
  }
});

// Helpers to broadcast events to renderer
function broadcastPipelineEvent(event: any) {
  const events = store.get('pipeline_events', []) as any[];
  events.unshift(event);
  if (events.length > 50) events.pop();
  store.set('pipeline_events', events);
  mainWindow?.webContents.send('pipeline-event', event);
}

function broadcastNotification(event: any) {
  const notifications = store.get('notifications', []) as any[];
  notifications.unshift(event);
  if (notifications.length > 100) notifications.pop();
  store.set('notifications', notifications);
  mainWindow?.webContents.send('notification-event', event);
}

// Parse Python output to generate pipeline events
function parsePythonOutput(output: string) {
  const lines = output.split('\n');
  const timestamp = new Date().toISOString();
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Change detected
    if (lower.includes('change detected') || lower.includes('file changed')) {
      broadcastPipelineEvent({
        id: `change-${Date.now()}`,
        timestamp,
        step: 'change_detected',
        status: 'done',
        message: line.trim(),
      });
    }
    
    // Debounce/waiting
    if (lower.includes('debounce') || lower.includes('waiting')) {
      broadcastPipelineEvent({
        id: `debounce-${Date.now()}`,
        timestamp,
        step: 'debounce_closed',
        status: 'done',
        message: line.trim(),
      });
    }
    
    // AI analysis
    if (lower.includes('ai analyzed') || lower.includes('analyzing') || lower.includes('ollama') || lower.includes('openai')) {
      broadcastPipelineEvent({
        id: `ai-${Date.now()}`,
        timestamp,
        step: 'ai_analyzed',
        status: 'done',
        message: line.trim(),
      });
    }
    
    // Commit generated
    if (lower.includes('commit generated') || lower.includes('commit created') || lower.includes('git commit')) {
      broadcastPipelineEvent({
        id: `commit-${Date.now()}`,
        timestamp,
        step: 'commit_generated',
        status: 'done',
        message: line.trim(),
      });
      
      broadcastNotification({
        id: `notif-${Date.now()}`,
        timestamp,
        type: 'success',
        message: 'Commit generated successfully',
        read: false,
      });
    }
    
    // Push events
    if (lower.includes('push queued') || lower.includes('pushing')) {
      broadcastPipelineEvent({
        id: `push-${Date.now()}`,
        timestamp,
        step: 'push_queued',
        status: 'pending',
        message: line.trim(),
      });
    }
    
    if (lower.includes('push completed') || lower.includes('pushed')) {
      broadcastPipelineEvent({
        id: `push-${Date.now()}`,
        timestamp,
        step: 'push_completed',
        status: 'done',
        message: line.trim(),
      });
      
      broadcastNotification({
        id: `notif-${Date.now()}`,
        timestamp,
        type: 'success',
        message: 'Changes pushed to remote',
        read: false,
      });
    }
    
    if (lower.includes('push failed') || lower.includes('push error')) {
      broadcastPipelineEvent({
        id: `push-${Date.now()}`,
        timestamp,
        step: 'push_failed',
        status: 'failed',
        message: line.trim(),
      });
      
      broadcastNotification({
        id: `notif-${Date.now()}`,
        timestamp,
        type: 'error',
        message: 'Push failed: ' + line.trim(),
        read: false,
      });
    }
    
    // Risk exceeded
    if (lower.includes('risk') || lower.includes('threshold exceeded')) {
      broadcastPipelineEvent({
        id: `risk-${Date.now()}`,
        timestamp,
        step: 'risk_exceeded',
        status: 'pending',
        message: line.trim(),
      });
      
      broadcastNotification({
        id: `notif-${Date.now()}`,
        timestamp,
        type: 'warning',
        message: 'Risk threshold exceeded - review required',
        read: false,
      });
    }
    
    // Commit approved/rejected
    if (lower.includes('commit approved')) {
      broadcastPipelineEvent({
        id: `approval-${Date.now()}`,
        timestamp,
        step: 'commit_approved',
        status: 'done',
        message: line.trim(),
      });
    }
    
    if (lower.includes('commit rejected')) {
      broadcastPipelineEvent({
        id: `approval-${Date.now()}`,
        timestamp,
        step: 'commit_rejected',
        status: 'failed',
        message: line.trim(),
      });
    }
    
    // General errors
    if (lower.includes('error') && !lower.includes('push error')) {
      broadcastNotification({
        id: `notif-${Date.now()}`,
        timestamp,
        type: 'error',
        message: line.trim(),
        read: false,
      });
    }
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopPythonBackend();
});
