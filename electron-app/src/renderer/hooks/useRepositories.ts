import { useState, useEffect } from 'react'

export function useRepositories() {
  const [repositories, setRepositories] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRepositories = async () => {
    try {
      if (window.electronAPI) {
        const githubData = await window.electronAPI.getGitHubRepositories()

        if (!githubData?.error) {
          setRepositories(githubData)
          setError(null)
          return
        }

        const data = await window.electronAPI.getRepositories()
        if (data.error) {
          setError(githubData.error || data.error)
        } else {
          setRepositories(data)
          setError(null)
        }
      }
    } catch (err) {
      setError('Failed to fetch repositories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepositories()
    const interval = setInterval(fetchRepositories, 10000)
    return () => clearInterval(interval)
  }, [])

  return { repositories, loading, error, refetch: fetchRepositories }
}
