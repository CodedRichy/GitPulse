import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Analytics
  getAnalytics: () => ipcRenderer.invoke('get-analytics'),
  getRepositories: () => ipcRenderer.invoke('get-repositories'),
  
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config: any) => ipcRenderer.invoke('update-config', config),
  
  // Monitoring
  startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
  stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
  
  // GitHub
  getGitHubToken: () => ipcRenderer.invoke('get-github-token'),
  setGitHubToken: (token: string) => ipcRenderer.invoke('set-github-token', token),
  clearGitHubToken: () => ipcRenderer.invoke('clear-github-token'),
  
  // Python output listeners
  onPythonOutput: (callback: (output: string) => void) => {
    ipcRenderer.on('python-output', (_, output) => callback(output));
  },
  onPythonError: (callback: (error: string) => void) => {
    ipcRenderer.on('python-error', (_, error) => callback(error));
  },
  onPythonStopped: (callback: (code: number) => void) => {
    ipcRenderer.on('python-stopped', (_, code) => callback(code));
  },
});
