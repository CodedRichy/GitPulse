import { Github, AlertCircle, ShieldAlert } from 'lucide-react'
import { RepositoryStats } from '../../../shared/types'

interface RepoCardProps {
  name: string
  stats: RepositoryStats
  onDetails?: (name: string, stats: RepositoryStats) => void
  onSettings?: (name: string, stats: RepositoryStats) => void
}

export default function RepoCard({ name, stats, onDetails, onSettings }: RepoCardProps) {
  const commits = stats.commits || 0
  const pushes = stats.pushes || 0
  const errors = stats.errors || 0
  const status = stats.status || (commits > 0 ? 'watching' : 'idle')
  const riskLevel = stats.risk_level || 'low'
  const confidence = stats.confidence ?? 85
  const lastActivity = stats.last_activity || stats.last_commit || stats.last_push

  const statusLabel = status === 'committing' ? 'Committing' : status === 'watching' ? 'Watching' : 'System Idle'
  const riskColor = riskLevel === 'high' ? 'text-destructive' : riskLevel === 'medium' ? 'text-[rgb(180,83,9)]' : 'text-[rgb(21,128,61)]'

  return (
    <div className="neu-card p-6 hover:shadow-neu-hover transition-all duration-300 group">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full neu-button flex items-center justify-center group-hover:scale-105 transition-all duration-300">
            <Github className="w-6 h-6 text-primary group-hover:drop-shadow-glow-primary transition-all" />
          </div>
          <div>
            <h3 className="font-semibold text-lg tracking-wide text-foreground">{name}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full neu-section text-[11px] font-semibold text-[rgba(30,32,34,0.88)]">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'committing' ? 'bg-primary animate-pulse' : status === 'watching' ? 'bg-success' : 'bg-muted-foreground'}`} />
                {statusLabel}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1 rounded-neu-sm neu-section px-2 py-1 text-[11px] font-semibold ${riskColor}`}>
            <ShieldAlert className="w-3 h-3" /> {riskLevel.toUpperCase()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{confidence}% confidence</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 neu-section rounded-neu-sm mb-6">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Commits</p>
          <p className="text-2xl font-bold text-foreground">{commits}</p>
        </div>
        <div className="text-center border-x border-border/40">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Pushes</p>
          <p className="text-2xl font-bold text-foreground">{pushes}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 flex items-center justify-center gap-1">
            {errors > 0 && <AlertCircle className="w-3 h-3 text-destructive" />}
            Errors
          </p>
          <p className={`text-2xl font-bold ${errors > 0 ? 'text-destructive drop-shadow-glow-error' : 'text-foreground'}`}>
            {errors}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => onDetails?.(name, stats)}
          className="flex-1 py-2.5 px-4 rounded-neu-sm neu-button transition-all duration-300 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          View Details
        </button>
        <button 
          onClick={() => onSettings?.(name, stats)}
          className="flex-1 py-2.5 px-4 rounded-neu-sm neu-button transition-all duration-300 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Configure
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Last activity: {lastActivity ? new Date(lastActivity).toLocaleString() : 'No activity yet'}
      </p>
    </div>
  )
}
