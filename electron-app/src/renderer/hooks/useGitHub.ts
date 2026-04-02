import { useState, useEffect } from 'react'

export function useGitHub() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadToken = async () => {
    try {
      if (window.electronAPI) {
        const savedToken = await window.electronAPI.getGitHubToken()
        setToken(savedToken)
        if (savedToken) {
          await fetchUserProfile(savedToken)
        }
      }
    } catch (err) {
      setError('Failed to load GitHub token')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (githubToken: string) => {
    try {
      // GitHub API call would go here
      // For now, simulate user data
      setUser({
        login: 'gitpulse-user',
        name: 'GitPulse User',
        avatar_url: 'https://github.com/github.png',
        public_repos: 21,
        created_at: '2024-01-01T00:00:00Z'
      })
    } catch (err) {
      setError('Failed to fetch GitHub profile')
    }
  }

  const setGitHubToken = async (newToken: string) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.setGitHubToken(newToken)
        setToken(newToken)
        await fetchUserProfile(newToken)
      }
    } catch (err) {
      setError('Failed to set GitHub token')
    }
  }

  const clearGitHubToken = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.clearGitHubToken()
        setToken(null)
        setUser(null)
      }
    } catch (err) {
      setError('Failed to clear GitHub token')
    }
  }

  useEffect(() => {
    loadToken()
  }, [])

  return {
    token,
    user,
    loading,
    error,
    setGitHubToken,
    clearGitHubToken,
    isAuthenticated: !!token
  }
}
