import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RepositoryStats } from '../../shared/types'

export default function AutomationRules() {
  const location = useLocation()
  const state = location.state as { repoName?: string; stats?: RepositoryStats } | null
  const repoName = state?.repoName || 'Global Rules'
  const [riskThreshold, setRiskThreshold] = useState(70)
  const [autoPushLowRisk, setAutoPushLowRisk] = useState(true)
  const [excludePatterns, setExcludePatterns] = useState('*.env,dist/**,node_modules/**')

  const saveRules = async () => {
    const payload = {
      rule_scope: repoName,
      risk_threshold: riskThreshold,
      auto_push_low_risk: autoPushLowRisk,
      exclude_patterns: excludePatterns,
    }

    localStorage.setItem('gitpulse_automation_rules', JSON.stringify(payload))

    if (window.electronAPI) {
      await window.electronAPI.updateConfig(payload)
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Automation Rules</h1>
        <p className="text-muted-foreground mt-1">Tune commit/push behavior with clear safety controls for {repoName}.</p>
      </div>

      <div className="neu-card p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2 text-foreground">Risk Threshold: {riskThreshold}</label>
          <input type="range" min="10" max="100" value={riskThreshold} onChange={(e) => setRiskThreshold(Number(e.target.value))} className="w-full accent-primary" />
          <p className="text-xs text-muted-foreground mt-2">Changes above this score require manual review.</p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={autoPushLowRisk} onChange={(e) => setAutoPushLowRisk(e.target.checked)} className="w-4 h-4 accent-primary" />
          <span className="text-sm text-foreground">Auto-push low-risk commits</span>
        </label>

        <div>
          <label className="block text-sm font-semibold mb-2 text-foreground">Excluded file patterns</label>
          <textarea value={excludePatterns} onChange={(e) => setExcludePatterns(e.target.value)} rows={3} className="w-full neu-section rounded-neu-sm p-3 text-sm text-foreground focus:outline-none" />
        </div>

        <div className="flex justify-end">
          <button onClick={saveRules} className="neu-button px-5 py-2 rounded-neu-sm text-primary font-semibold">Save Rules</button>
        </div>
      </div>
    </div>
  )
}
