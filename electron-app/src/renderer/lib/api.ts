import { AnalyticsData, ConfigData, RepositoryStats } from '../../shared/types'

class API {
  async getAnalytics(): Promise<AnalyticsData> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    const result = await window.electronAPI.getAnalytics()
    if (result.error) throw new Error(result.error)
    return result
  }

  async getRepositories(): Promise<Record<string, RepositoryStats>> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    const result = await window.electronAPI.getRepositories()
    if (result.error) throw new Error(result.error)
    return result
  }

  async getConfig(): Promise<ConfigData> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    const result = await window.electronAPI.getConfig()
    if (result.error) throw new Error(result.error)
    return result
  }

  async updateConfig(config: Partial<ConfigData>): Promise<void> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    const result = await window.electronAPI.updateConfig(config)
    if (result.error) throw new Error(result.error)
  }

  async startMonitoring(): Promise<void> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    const result = await window.electronAPI.startMonitoring()
    if (result.error) throw new Error(result.error)
  }

  async stopMonitoring(): Promise<void> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    const result = await window.electronAPI.stopMonitoring()
    if (result.error) throw new Error(result.error)
  }

  async getGitHubToken(): Promise<string | null> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    return await window.electronAPI.getGitHubToken()
  }

  async setGitHubToken(token: string): Promise<void> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    const result = await window.electronAPI.setGitHubToken(token)
    if (result.error) throw new Error(result.error)
  }

  async clearGitHubToken(): Promise<void> {
    if (!window.electronAPI) throw new Error('Electron API not available')
    const result = await window.electronAPI.clearGitHubToken()
    if (result.error) throw new Error(result.error)
  }

  onPythonOutput(callback: (output: string) => void): void {
    if (!window.electronAPI) return
    window.electronAPI.onPythonOutput(callback)
  }

  onPythonError(callback: (error: string) => void): void {
    if (!window.electronAPI) return
    window.electronAPI.onPythonError(callback)
  }

  onPythonStopped(callback: (code: number) => void): void {
    if (!window.electronAPI) return
    window.electronAPI.onPythonStopped(callback)
  }
}

export const api = new API()
