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
      acc[repo.full_name || repo.name] = {
        commits: 0,
        pushes: 0,
        errors: 0,
        last_push: repo.pushed_at || undefined,
        last_commit: repo.updated_at || undefined,
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
