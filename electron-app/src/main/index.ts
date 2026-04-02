import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import Store = require('electron-store');

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
  return store.get('github_token');
});

ipcMain.handle('set-github-token', (_, token) => {
  store.set('github_token', token);
  return { success: true };
});

ipcMain.handle('clear-github-token', () => {
  store.delete('github_token');
  return { success: true };
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
