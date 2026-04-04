import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, Trash2, Check } from 'lucide-react'
import { useNotifications } from '../hooks/useEvents'

export default function Notifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll } = useNotifications()

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><Bell className="w-7 h-7 text-primary" /> Notifications</h1>
          <p className="text-muted-foreground mt-1">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" /> Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-sm bg-primary text-white rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Commit success, failures, warnings, and workflow updates.</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="neu-button px-3 py-2 rounded-neu-sm text-sm text-foreground flex items-center gap-1">
              <Check className="w-4 h-4" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="neu-button px-3 py-2 rounded-neu-sm text-sm text-destructive flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          )}
        </div>
      </div>

      <div className="neu-card p-6 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No notifications yet.</div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => !n.read && markAsRead(n.id)}
              className={`neu-section rounded-neu-sm p-4 flex items-center justify-between cursor-pointer transition-opacity ${n.read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {n.type === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                {n.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
                <div>
                  <p className="text-sm text-foreground">{n.message}</p>
                  {n.repo_name && <p className="text-xs text-muted-foreground">{n.repo_name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!n.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                <span className="text-xs text-muted-foreground">{formatTime(n.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
