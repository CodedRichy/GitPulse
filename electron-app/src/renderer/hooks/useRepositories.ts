import { useState, useEffect } from 'react'

export function useRepositories() {
  const [repositories, setRepositories] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRepositories = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getRepositories()
        if (data.error) {
          setError(data.error)
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
