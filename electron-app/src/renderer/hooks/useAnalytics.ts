import { useState, useEffect } from 'react'

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getAnalytics()
        if (data.error) {
          setError(data.error)
        } else {
          setAnalytics(data)
          setError(null)
        }
      }
    } catch (err) {
      setError('Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 5000)
    return () => clearInterval(interval)
  }, [])

  return { analytics, loading, error, refetch: fetchAnalytics }
}
