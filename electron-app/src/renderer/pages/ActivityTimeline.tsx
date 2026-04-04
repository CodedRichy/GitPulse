import { Activity, GitCommit, Bot, UploadCloud, ShieldCheck, XCircle, CheckCircle2 } from 'lucide-react'
import { usePipelineEvents } from '../hooks/useEvents'

const stepConfig: Record<string, { label: string; icon: any }> = {
  change_detected: { label: 'Change detected', icon: Activity },
  debounce_closed: { label: 'Debounce window closed', icon: ShieldCheck },
  ai_analyzed: { label: 'AI analyzed diff', icon: Bot },
  commit_generated: { label: 'Commit generated', icon: GitCommit },
  push_queued: { label: 'Push queued', icon: UploadCloud },
  push_completed: { label: 'Push completed', icon: CheckCircle2 },
  push_failed: { label: 'Push failed', icon: XCircle },
  risk_exceeded: { label: 'Risk threshold exceeded', icon: ShieldCheck },
  commit_approved: { label: 'Commit approved', icon: CheckCircle2 },
  commit_rejected: { label: 'Commit rejected', icon: XCircle },
}

export default function ActivityTimeline() {
  const { events, loading } = usePipelineEvents()

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Timeline</h1>
          <p className="text-muted-foreground mt-1">Real-time pipeline from file changes to commit/push.</p>
        </div>
        <div className="neu-card p-6 text-center text-muted-foreground">Loading events...</div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Timeline</h1>
          <p className="text-muted-foreground mt-1">Real-time pipeline from file changes to commit/push.</p>
        </div>
        <div className="neu-card p-6 text-center text-muted-foreground">
          No activity yet. Start monitoring to see real-time pipeline events.
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Timeline</h1>
        <p className="text-muted-foreground mt-1">Real-time pipeline from file changes to commit/push.</p>
      </div>

      <div className="neu-card p-6 space-y-4">
        {events.map((event, index) => {
          const config = stepConfig[event.step] || { label: event.step, icon: Activity }
          const Icon = config.icon
          const done = event.status === 'done'
          const failed = event.status === 'failed'
          const pending = event.status === 'pending'
          const time = new Date(event.timestamp).toLocaleTimeString()
          
          return (
            <div key={event.id} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${done ? 'neu-button' : failed ? 'bg-destructive/20' : 'neu-section'}`}>
                <Icon className={`w-4 h-4 ${done ? 'text-primary' : failed ? 'text-destructive' : pending ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{config.label}</p>
                {event.message && <p className="text-xs text-muted-foreground truncate max-w-md">{event.message}</p>}
                <p className="text-xs text-muted-foreground">{time}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${done ? 'bg-green-500/20 text-green-700' : failed ? 'bg-red-500/20 text-red-700' : pending ? 'bg-yellow-500/20 text-yellow-700' : 'bg-gray-500/20 text-gray-700'}`}>
                {event.status}
              </span>
              {index < events.length - 1 && <div className="w-px h-6 bg-border/50" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
