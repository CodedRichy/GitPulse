import { PipelineEvent, NotificationEvent } from '../../shared/types'

declare global {
  interface Window {
    electronAPI?: {
      // Analytics
      getAnalytics: () => Promise<any>
      getRepositories: () => Promise<any>
      
      // Config
      getConfig: () => Promise<any>
      updateConfig: (config: any) => Promise<any>
      
      // Monitoring
      startMonitoring: () => Promise<any>
      stopMonitoring: () => Promise<any>
      
      // GitHub
      getGitHubToken: () => Promise<string | null>
      getGitHubRepositories: () => Promise<any>
      setGitHubToken: (token: string) => Promise<any>
      clearGitHubToken: () => Promise<any>
      startGitHubDeviceFlow: () => Promise<any>
      pollGitHubDeviceFlow: (deviceCode: string) => Promise<any>
      openExternalUrl: (url: string) => Promise<any>
      
      // Python output listeners
      onPythonOutput: (callback: (output: string) => void) => void
      onPythonError: (callback: (error: string) => void) => void
      onPythonStopped: (callback: (code: number) => void) => void
      
      // Pipeline events streaming
      onPipelineEvent: (callback: (event: PipelineEvent) => void) => void
      onNotificationEvent: (callback: (event: NotificationEvent) => void) => void
      markNotificationRead: (id: string) => Promise<any>
      clearAllNotifications: () => Promise<any>
      getNotifications: () => Promise<NotificationEvent[]>
      getPipelineEvents: () => Promise<PipelineEvent[]>
      
      // Git operations
      getGitDiff: (repoPath: string) => Promise<{ success?: boolean; diff?: string; error?: string }>
      getGitStatus: (repoPath: string) => Promise<{ success?: boolean; files?: Array<{ status: string; file: string }>; error?: string }>
      generateCommitMessage: (params: { repoPath: string; diff: string }) => Promise<{ success?: boolean; message?: string; risk?: string; confidence?: number; error?: string }>
      commitChanges: (params: { repoPath: string; message: string }) => Promise<{ success?: boolean; output?: string; error?: string }>
      pushChanges: (repoPath: string) => Promise<{ success?: boolean; output?: string; error?: string }>
      discardChanges: (repoPath: string) => Promise<{ success?: boolean; error?: string }>
    }
  }
}

export {}
