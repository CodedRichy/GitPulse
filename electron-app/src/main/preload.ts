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
  getGitHubRepositories: () => ipcRenderer.invoke('get-github-repositories'),
  setGitHubToken: (token: string) => ipcRenderer.invoke('set-github-token', token),
  clearGitHubToken: () => ipcRenderer.invoke('clear-github-token'),
  startGitHubDeviceFlow: () => ipcRenderer.invoke('start-github-device-flow'),
  pollGitHubDeviceFlow: (deviceCode: string) => ipcRenderer.invoke('poll-github-device-flow', deviceCode),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  
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
  
  // Pipeline events streaming
  onPipelineEvent: (callback: (event: { id: string; timestamp: string; step: string; status: string; repo_name?: string; message?: string; risk_level?: string; confidence?: number }) => void) => {
    ipcRenderer.on('pipeline-event', (_, event) => callback(event));
  },
  onNotificationEvent: (callback: (event: { id: string; timestamp: string; type: 'success' | 'warning' | 'error' | 'info'; message: string; repo_name?: string; read: boolean }) => void) => {
    ipcRenderer.on('notification-event', (_, event) => callback(event));
  },
  markNotificationRead: (id: string) => ipcRenderer.invoke('mark-notification-read', id),
  clearAllNotifications: () => ipcRenderer.invoke('clear-all-notifications'),
  getNotifications: () => ipcRenderer.invoke('get-notifications'),
  getPipelineEvents: () => ipcRenderer.invoke('get-pipeline-events'),
  
  // Git operations
  getGitDiff: (repoPath: string) => ipcRenderer.invoke('get-git-diff', repoPath),
  getGitStatus: (repoPath: string) => ipcRenderer.invoke('get-git-status', repoPath),
  generateCommitMessage: (params: { repoPath: string; diff: string }) => ipcRenderer.invoke('generate-commit-message', params),
  commitChanges: (params: { repoPath: string; message: string }) => ipcRenderer.invoke('commit-changes', params),
  pushChanges: (repoPath: string) => ipcRenderer.invoke('push-changes', repoPath),
  discardChanges: (repoPath: string) => ipcRenderer.invoke('discard-changes', repoPath),
});
