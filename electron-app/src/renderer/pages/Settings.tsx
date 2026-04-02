import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Zap, Clock, BarChart3, Save } from 'lucide-react'

export default function Settings() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getConfig()
      if (!data.error) {
        setConfig(data)
        setLoading(false)
      }
    }
  }

  const saveConfig = async () => {
    if (window.electronAPI && config) {
      setSaving(true)
      await window.electronAPI.updateConfig(config)
      setSaving(false)
    }
  }

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value })
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure GitPulse to match your workflow</p>
      </div>

      {/* AI Provider Settings */}
      <div className="neu-card p-6 border border-black/5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">AI Provider</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select AI Provider</label>
            <div className="grid grid-cols-3 gap-4">
              {['ollama', 'openai', 'anthropic'].map((provider) => (
                <button
                  key={provider}
                  onClick={() => updateConfig('ai_provider', provider)}
                  className={`
                    p-4 rounded-neu-sm border transition-all
                    ${config?.ai_provider === provider
                      ? 'border-primary bg-primary/5 shadow-neu-sm'
                      : 'border-black/5 hover:border-primary/30 shadow-neu-sm'
                    }
                  `}
                >
                  <p className="font-semibold capitalize">{provider}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {provider === 'ollama' ? 'Local & Free' : 'Cloud API'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {config?.ai_provider === 'ollama' && (
            <div>
              <label className="block text-sm font-medium mb-2">Ollama Model</label>
              <input
                type="text"
                value={config?.ollama_model || 'qwen3.5:9b'}
                onChange={(e) => updateConfig('ollama_model', e.target.value)}
                className="w-full px-4 py-2 bg-neu-base border border-black/5 rounded-neu-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-neu-sm"
                placeholder="qwen3.5:9b"
              />
            </div>
          )}
        </div>
      </div>

      {/* Timing Settings */}
      <div className="neu-card p-6 border border-black/5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Timing</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Debounce Seconds: <span className="text-primary font-bold">{config?.debounce_seconds || 60}s</span>
            </label>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={config?.debounce_seconds || 60}
              onChange={(e) => updateConfig('debounce_seconds', parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Wait time after last file change before auto-commit
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Settings */}
      <div className="neu-card p-6 border border-black/5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Analytics</h2>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config?.enable_analytics !== false}
              onChange={(e) => updateConfig('enable_analytics', e.target.checked)}
              className="w-5 h-5 rounded border-black/5 accent-primary"
            />
            <div>
              <p className="font-medium">Enable Analytics Tracking</p>
              <p className="text-sm text-muted-foreground">Track productivity metrics and AI usage</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config?.enable_notifications !== false}
              onChange={(e) => updateConfig('enable_notifications', e.target.checked)}
              className="w-5 h-5 rounded border-black/5 accent-primary"
            />
            <div>
              <p className="font-medium">Desktop Notifications</p>
              <p className="text-sm text-muted-foreground">Show notifications for commits and errors</p>
            </div>
          </label>
        </div>
      </div>

      {/* User Tier Info */}
      <div className="bg-primary/5 border border-primary/10 rounded-neu-lg p-6 shadow-neu-sm">
        <h2 className="text-xl font-semibold mb-2">Current Plan</h2>
        <p className="text-2xl font-bold text-primary mb-4">{config?.user_tier?.toUpperCase() || 'FREE'} Tier</p>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            ✓ Max Repositories: {config?.feature_limits?.max_repos || 1}
          </p>
          <p className="text-muted-foreground">
            ✓ AI Commits/Month: {config?.feature_limits?.ai_commits_per_month || 100}
          </p>
          <p className="text-muted-foreground">
            {config?.feature_limits?.cloud_providers ? '✓' : '✗'} Cloud AI Providers
          </p>
        </div>
        {config?.user_tier === 'free' && (
          <button className="mt-4 px-6 py-2 neu-button text-primary font-bold transition-all duration-300">
            Upgrade to Pro - $9/month
          </button>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 neu-button text-primary font-bold transition-all duration-300 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
