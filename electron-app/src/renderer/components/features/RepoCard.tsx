import { FolderGit2, CheckCircle2, XCircle, Clock, Github, AlertCircle } from 'lucide-react'
import { RepositoryStats } from '../../shared/types'

interface RepoCardProps {
  name: string
  stats: RepositoryStats
  onDetails?: (name: string) => void
  onSettings?: (name: string) => void
}

export default function RepoCard({ name, stats, onDetails, onSettings }: RepoCardProps) {
  const commits = stats.commits || 0
  const pushes = stats.pushes || 0
  const errors = stats.errors || 0
  const isActive = commits > 0

  return (
    <div className="rounded-neu bg-neu-base p-6 shadow-neu-base border border-black/5 hover:shadow-neu-hover transition-all duration-300 group">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full shadow-neu-sm flex items-center justify-center group-hover:scale-105 transition-all duration-300">
            <Github className="w-6 h-6 text-primary group-hover:drop-shadow-glow-primary transition-all" />
          </div>
          <div>
            <h3 className="font-semibold text-lg tracking-wide text-foreground">{name}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              {isActive ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-neu-sm text-[10px] font-medium text-success">
                  <div className="w-1.5 h-1.5 rounded-full bg-success shadow-glow-success animate-pulse" />
                  Monitoring Active
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-neu-sm text-[10px] font-medium text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  System Idle
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 rounded-neu-sm shadow-neu-sm mb-6">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Commits</p>
          <p className="text-2xl font-bold text-foreground">{commits}</p>
        </div>
        <div className="text-center border-x border-black/5">
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
          onClick={() => onDetails?.(name)}
          className="flex-1 py-2.5 px-4 rounded-neu-sm shadow-neu-sm hover:shadow-neu-sm-hover transition-all duration-300 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          View Details
        </button>
        <button 
          onClick={() => onSettings?.(name)}
          className="flex-1 py-2.5 px-4 rounded-neu-sm shadow-neu-sm hover:shadow-neu-sm-hover transition-all duration-300 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Configure
        </button>
      </div>
    </div>
  )
}
