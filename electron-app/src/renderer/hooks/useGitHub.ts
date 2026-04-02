import { useState, useEffect } from 'react'

interface DeviceAuthState {
  userCode: string
  verificationUri: string
}

export function useGitHub() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [deviceAuth, setDeviceAuth] = useState<DeviceAuthState | null>(null)

  const fetchUserProfile = async (githubToken: string) => {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    })

    if (response.status === 401) {
      throw new Error('GitHub authentication failed. Please sign in again.')
    }

    if (response.status === 403) {
      throw new Error('GitHub API rate-limited or access denied. Please try again shortly.')
    }

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub profile from API.')
    }

    return response.json()
  }

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const connectWithGitHub = async () => {
    try {
      setConnecting(true)
      setError(null)
      setDeviceAuth(null)

      if (!window.electronAPI) {
        setError('Desktop bridge unavailable. Please restart the app.')
        return false
      }

      const start = await window.electronAPI.startGitHubDeviceFlow()
      if (!start?.success || !start?.data) {
        setError(start?.error || 'Failed to start GitHub sign-in.')
        return false
      }

      const { deviceCode, userCode, verificationUri, expiresIn, interval } = start.data
      setDeviceAuth({ userCode, verificationUri })

      const openResult = await window.electronAPI.openExternalUrl(verificationUri)
      if (!openResult?.success) {
        setError(openResult?.error || 'Failed to open GitHub sign-in page.')
        return false
      }

      const startedAt = Date.now()
      let pollIntervalMs = Math.max((interval || 5) * 1000, 3000)

      while (Date.now() - startedAt < (expiresIn || 900) * 1000) {
        await wait(pollIntervalMs)
        const poll = await window.electronAPI.pollGitHubDeviceFlow(deviceCode)

        if (poll?.success && poll?.accessToken) {
          const profile = await fetchUserProfile(poll.accessToken)
          await window.electronAPI.setGitHubToken(poll.accessToken)
          setToken(poll.accessToken)
          setUser(profile)
          setDeviceAuth(null)
          return true
        }

        if (poll?.status === 'pending') {
          continue
        }

        if (poll?.status === 'slow_down') {
          pollIntervalMs += 2000
          continue
        }

        setError(poll?.error || 'GitHub sign-in failed. Please try again.')
        return false
      }

      setError('GitHub sign-in timed out. Please try again.')
      return false
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to connect GitHub account')
      }
      return false
    } finally {
      setConnecting(false)
    }
  }

  const loadToken = async () => {
    try {
      setError(null)
      if (window.electronAPI) {
        const savedToken = await window.electronAPI.getGitHubToken()

        if (savedToken) {
          try {
            const profile = await fetchUserProfile(savedToken)
            setToken(savedToken)
            setUser(profile)
          } catch {
            await window.electronAPI.clearGitHubToken()
            setToken(null)
            setUser(null)
            setError('Saved GitHub token is no longer valid. Please reconnect your account.')
          }
        } else {
          setToken(null)
          setUser(null)
        }
      }
    } catch {
      setError('Failed to load GitHub token')
    } finally {
      setLoading(false)
    }
  }

  const setGitHubToken = async (newToken: string) => {
    const trimmedToken = newToken.trim()
    if (!trimmedToken) {
      setError('Please enter a GitHub token.')
      return false
    }

    try {
      setConnecting(true)
      setError(null)

      if (window.electronAPI) {
        const profile = await fetchUserProfile(trimmedToken)
        await window.electronAPI.setGitHubToken(trimmedToken)
        setToken(trimmedToken)
        setUser(profile)
        return true
      }

      setError('Desktop bridge unavailable. Please restart the app.')
      return false
    } catch (err) {
      setUser(null)
      setToken(null)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to connect GitHub account')
      }
      return false
    } finally {
      setConnecting(false)
    }
  }

  const clearGitHubToken = async () => {
    try {
      setError(null)
      if (window.electronAPI) {
        await window.electronAPI.clearGitHubToken()
        setToken(null)
        setUser(null)
      }
    } catch {
      setError('Failed to clear GitHub token')
    }
  }

  const clearError = () => {
    setError(null)
  }

  useEffect(() => {
    loadToken()
  }, [])

  return {
    token,
    user,
    loading,
    error,
    connecting,
    deviceAuth,
    setGitHubToken,
    connectWithGitHub,
    clearGitHubToken,
    clearError,
    isAuthenticated: !!token && !!user
  }
}
