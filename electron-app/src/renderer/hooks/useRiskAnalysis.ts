import { useState, useEffect, useCallback } from 'react'

export interface RiskDriver {
  label: string
  value: number
  type: 'positive' | 'negative'
}

export interface RiskAnalysis {
  score: number
  level: 'low' | 'medium' | 'high'
  drivers: RiskDriver[]
  filesChanged: number
  linesAdded: number
  linesRemoved: number
  sensitivePathsTouched: string[]
}

const SENSITIVE_PATTERNS = [
  /\.env/i,
  /secrets?\//i,
  /config\./i,
  /password/i,
  /key/i,
  /token/i,
  /credential/i,
  /\.ssh/i,
  /\.aws/i,
  /private/i,
  /auth/i,
  /database\.json/i,
  /manifest\.json/i,
]

const TEST_PATTERNS = [
  /test/i,
  /spec/i,
  /__tests__/i,
  /\.test\./i,
  /\.spec\./i,
]

function calculateRiskFromDiff(diff: string, files: Array<{ status: string; file: string }>): RiskAnalysis {
  const lines = diff.split('\n')
  let linesAdded = 0
  let linesRemoved = 0
  const filesChanged = files.length
  const sensitivePathsTouched: string[] = []
  let testFilesCount = 0

  // Count added/removed lines
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      linesAdded++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      linesRemoved++
    }
  }

  // Check for sensitive paths and test files
  for (const file of files) {
    const path = file.file.toLowerCase()
    
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(path) && !sensitivePathsTouched.includes(file.file)) {
        sensitivePathsTouched.push(file.file)
        break
      }
    }

    for (const pattern of TEST_PATTERNS) {
      if (pattern.test(path)) {
        testFilesCount++
        break
      }
    }
  }

  // Calculate base risk score
  let score = 0
  const drivers: RiskDriver[] = []

  // File count risk (more files = higher risk)
  if (filesChanged > 20) {
    score += 25
    drivers.push({ label: 'Large number of files', value: 25, type: 'negative' })
  } else if (filesChanged > 10) {
    score += 15
    drivers.push({ label: 'Many files changed', value: 15, type: 'negative' })
  } else if (filesChanged > 5) {
    score += 8
    drivers.push({ label: 'Multiple files changed', value: 8, type: 'negative' })
  }

  // Diff size risk
  const totalLines = linesAdded + linesRemoved
  if (totalLines > 500) {
    score += 20
    drivers.push({ label: 'Very large diff', value: 20, type: 'negative' })
  } else if (totalLines > 200) {
    score += 12
    drivers.push({ label: 'Large diff size', value: 12, type: 'negative' })
  } else if (totalLines > 50) {
    score += 5
    drivers.push({ label: 'Moderate diff size', value: 5, type: 'negative' })
  }

  // Sensitive paths risk (major risk factor)
  if (sensitivePathsTouched.length > 0) {
    const sensitiveRisk = Math.min(sensitivePathsTouched.length * 15, 40)
    score += sensitiveRisk
    drivers.push({ 
      label: `Touched sensitive paths (${sensitivePathsTouched.length})`, 
      value: sensitiveRisk, 
      type: 'negative' 
    })
  }

  // Test files reduce risk
  if (testFilesCount > 0 && filesChanged > 0) {
    const testRatio = testFilesCount / filesChanged
    if (testRatio > 0.5) {
      score = Math.max(0, score - 15)
      drivers.push({ label: 'Primarily test files', value: -15, type: 'positive' })
    } else if (testRatio > 0.2) {
      score = Math.max(0, score - 8)
      drivers.push({ label: 'Good test coverage', value: -8, type: 'positive' })
    }
  }

  // Small changes are lower risk
  if (filesChanged <= 2 && totalLines <= 20) {
    score = Math.max(0, score - 5)
    drivers.push({ label: 'Small focused change', value: -5, type: 'positive' })
  }

  // Cap score at 100
  score = Math.min(100, Math.max(0, score))

  // Determine risk level
  let level: 'low' | 'medium' | 'high'
  if (score < 30) {
    level = 'low'
  } else if (score < 60) {
    level = 'medium'
  } else {
    level = 'high'
  }

  return {
    score,
    level,
    drivers: drivers.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    filesChanged,
    linesAdded,
    linesRemoved,
    sensitivePathsTouched,
  }
}

export function useRiskAnalysis(repoPath?: string) {
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeRisk = useCallback(async (path: string) => {
    if (!path || !window.electronAPI) {
      setError('No repository path provided')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [diffResult, statusResult] = await Promise.all([
        window.electronAPI.getGitDiff(path),
        window.electronAPI.getGitStatus(path),
      ])

      if (diffResult.error) {
        setError(diffResult.error)
        setLoading(false)
        return
      }

      const diff = diffResult.diff || ''
      const files = statusResult.files || []

      if (files.length === 0) {
        setAnalysis({
          score: 0,
          level: 'low',
          drivers: [{ label: 'No changes detected', value: 0, type: 'positive' }],
          filesChanged: 0,
          linesAdded: 0,
          linesRemoved: 0,
          sensitivePathsTouched: [],
        })
        setLoading(false)
        return
      }

      const result = calculateRiskFromDiff(diff, files)
      setAnalysis(result)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze risk')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-analyze when repoPath changes
  useEffect(() => {
    if (repoPath) {
      analyzeRisk(repoPath)
    }
  }, [repoPath, analyzeRisk])

  return {
    analysis,
    loading,
    error,
    analyzeRisk,
  }
}
