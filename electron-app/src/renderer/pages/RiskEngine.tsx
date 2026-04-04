import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldAlert, Gauge, CheckCircle2, AlertTriangle, AlertCircle, FileText, Hash, GitCommit, Loader2, RefreshCw } from 'lucide-react'
import { useRiskAnalysis } from '../hooks/useRiskAnalysis'

export default function RiskEngine() {
  const location = useLocation()
  const state = location.state as { repoName?: string; repoPath?: string } | null
  
  const repoName = state?.repoName
  const repoPath = state?.repoPath
  
  const { analysis, loading, error, analyzeRisk } = useRiskAnalysis(repoPath)
  const [saving, setSaving] = useState(false)

  const handleRefresh = () => {
    if (repoPath) {
      analyzeRisk(repoPath)
    }
  }

  const handleSaveBaseline = async () => {
    if (!analysis || !window.electronAPI) return
    
    setSaving(true)
    try {
      await window.electronAPI.updateConfig({
        risk_baseline: analysis.score,
        risk_baseline_repo: repoName || 'global',
      })
    } finally {
      setSaving(false)
    }
  }

  // Render loading state
  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Risk Engine</h1>
          <p className="text-muted-foreground mt-1">Analyzing repository changes...</p>
        </div>
        <div className="neu-card p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Calculating risk score from git diff...</p>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Risk Engine</h1>
          <p className="text-muted-foreground mt-1">Risk analysis failed</p>
        </div>
        <div className="neu-card p-6 border-l-4 border-destructive">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Analysis Error</h3>
          </div>
          <p className="text-muted-foreground">{error}</p>
          {repoPath && (
            <button 
              onClick={handleRefresh}
              className="mt-4 neu-button px-4 py-2 rounded-neu-sm text-primary font-semibold inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  // Render empty state (no repo selected)
  if (!repoPath || !analysis) {
    return (
      <div className="p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Risk Engine</h1>
          <p className="text-muted-foreground mt-1">Select a repository to analyze risk</p>
        </div>
        <div className="neu-card p-12 text-center">
          <ShieldAlert className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No repository selected for risk analysis.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Navigate to a repository from the Repositories page to see detailed risk analysis.
          </p>
        </div>
      </div>
    )
  }

  const { score, level, drivers, filesChanged, linesAdded, linesRemoved, sensitivePathsTouched } = analysis

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-amber-600'
      default: return 'text-green-600'
    }
  }

  const getRiskBg = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-600'
      case 'medium': return 'bg-amber-600'
      default: return 'bg-green-600'
    }
  }

  const getRiskDescription = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'High risk, manual review required'
      case 'medium': return 'Medium risk, review recommended'
      default: return 'Low risk, safe to auto-commit'
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Risk Engine</h1>
          <p className="text-muted-foreground mt-1">
            {repoName ? `Risk analysis for ${repoName}` : 'Understand why GitPulse classified a change as risky.'}
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="neu-button p-2 rounded-neu-sm disabled:opacity-50"
          title="Refresh analysis"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="neu-card p-6 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className={`w-5 h-5 ${getRiskColor(level)}`} />
            <h2 className="font-semibold">Current Score</h2>
          </div>
          <div className="flex items-end gap-2">
            <p className={`text-5xl font-bold ${getRiskColor(level)}`}>{score}</p>
            <span className="text-muted-foreground text-sm mb-1">/100</span>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-neu-section rounded-full overflow-hidden">
              <div 
                className={`h-full ${getRiskBg(level)} transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
          <p className={`text-xs mt-2 ${getRiskColor(level)}`}>
            {getRiskDescription(level)}
          </p>
        </div>

        <div className="neu-card p-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className={`w-5 h-5 ${getRiskColor(level)}`} />
            <h2 className="font-semibold">Score Drivers</h2>
          </div>
          
          {drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No significant risk factors detected.</p>
          ) : (
            <div className="space-y-2">
              {drivers.map((driver, index) => (
                <div 
                  key={index} 
                  className="neu-section rounded-neu-sm p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {driver.type === 'positive' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="text-sm text-foreground">{driver.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    driver.type === 'positive' ? 'text-green-600' : 
                    driver.value > 20 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {driver.value > 0 ? '+' : ''}{driver.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Files Changed</span>
          </div>
          <p className="text-2xl font-bold">{filesChanged}</p>
        </div>
        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <GitCommit className="w-4 h-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Lines Added</span>
          </div>
          <p className="text-2xl font-bold text-green-600">+{linesAdded}</p>
        </div>
        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <GitCommit className="w-4 h-4 text-red-600" />
            <span className="text-sm text-muted-foreground">Lines Removed</span>
          </div>
          <p className="text-2xl font-bold text-red-600">-{linesRemoved}</p>
        </div>
        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Total Lines</span>
          </div>
          <p className="text-2xl font-bold">{linesAdded + linesRemoved}</p>
        </div>
      </div>

      {sensitivePathsTouched.length > 0 && (
        <div className="neu-card p-6 border-l-4 border-red-600">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-red-600">Sensitive Paths Detected</h2>
          </div>
          <div className="space-y-1">
            {sensitivePathsTouched.map((path, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <code className="bg-red-50 px-2 py-1 rounded text-red-700">{path}</code>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Changes to these files significantly increase risk score. Manual review recommended.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button 
          onClick={handleSaveBaseline}
          disabled={saving || !analysis}
          className="neu-button px-4 py-2 rounded-neu-sm text-primary font-semibold inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Apply as Policy Baseline'}
        </button>
      </div>
    </div>
  )
}
