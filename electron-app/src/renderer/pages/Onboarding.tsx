import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, FolderOpen, Sparkles, ShieldCheck } from 'lucide-react'

interface OnboardingProps {
  onComplete: () => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [provider, setProvider] = useState<'ollama' | 'openai' | 'anthropic'>('ollama')
  const [mode, setMode] = useState<'safe' | 'balanced' | 'aggressive'>('balanced')
  const [localRepoPath, setLocalRepoPath] = useState('')

  const finishSetup = async () => {
    localStorage.setItem('gitpulse_onboarding_provider', provider)
    localStorage.setItem('gitpulse_onboarding_mode', mode)
    localStorage.setItem('gitpulse_onboarding_repo_path', localRepoPath)

    if (window.electronAPI) {
      await window.electronAPI.updateConfig({
        ai_provider: provider,
        automation_mode: mode,
        local_repo_path: localRepoPath,
      })

      await window.electronAPI.startMonitoring()
    }

    onComplete()
    navigate('/dashboard')
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome to GitPulse</h1>
        <p className="text-muted-foreground mt-1">Finish this quick setup to start monitored, AI-assisted git workflow.</p>
      </div>

      <div className="neu-section rounded-neu-sm p-3 text-sm text-foreground flex items-center justify-between">
        <span>Step {step} of 4</span>
        <span className="text-muted-foreground">Estimated time: under 3 min</span>
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="neu-card-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Github className="w-5 h-5 text-primary" /> Connect GitHub</h2>
            <p className="text-sm text-muted-foreground">Link your GitHub account from Account page to sync repositories and activity.</p>
            <a href="#/account" className="neu-button px-4 py-2 rounded-neu-sm inline-flex text-sm font-semibold text-primary">Open Account</a>
          </div>

          <div className="neu-card-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><FolderOpen className="w-5 h-5 text-primary" /> Select Local Repo Folder</h2>
            <p className="text-sm text-muted-foreground">Optional path used by local monitoring agent.</p>
            <input
              value={localRepoPath}
              onChange={(e) => setLocalRepoPath(e.target.value)}
              placeholder="e.g. C:\\Users\\you\\Projects"
              className="w-full neu-section rounded-neu-sm p-3 text-sm text-foreground focus:outline-none"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="neu-card p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Choose AI Provider</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {(['ollama', 'openai', 'anthropic'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`rounded-neu-sm py-3 px-4 text-sm font-semibold transition-all ${provider === p ? 'neu-button text-primary' : 'neu-section text-foreground'}`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="neu-card p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Choose Automation Mode</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {(['safe', 'balanced', 'aggressive'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-neu-sm py-3 px-4 text-sm font-semibold transition-all capitalize ${mode === m ? 'neu-button text-primary' : 'neu-section text-foreground'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Balanced is recommended for most users.</p>
        </div>
      )}

      {step === 4 && (
        <div className="neu-card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Confirm Setup</h2>
          <div className="space-y-2 text-sm">
            <p className="text-foreground">Provider: <span className="font-semibold">{provider.toUpperCase()}</span></p>
            <p className="text-foreground">Automation: <span className="font-semibold capitalize">{mode}</span></p>
            <p className="text-foreground">Repo Path: <span className="font-semibold">{localRepoPath || 'Not set'}</span></p>
          </div>
          <p className="text-xs text-muted-foreground">This will save preferences and start monitoring.</p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          className="neu-button px-6 py-3 rounded-neu-sm text-foreground font-bold"
          disabled={step === 1}
        >
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((current) => Math.min(4, current + 1))}
            className="neu-button px-6 py-3 rounded-neu-sm text-primary font-bold"
          >
            Next
          </button>
        ) : (
          <button onClick={finishSetup} className="neu-button px-6 py-3 rounded-neu-sm text-primary font-bold">Start Monitoring</button>
        )}
      </div>
    </div>
  )
}
