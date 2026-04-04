import { Shield, KeyRound, Ban } from 'lucide-react'

export default function SecuritySafety() {
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Security & Safety</h1>
        <p className="text-muted-foreground mt-1">Visibility into blocked commits and secret detection.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="neu-card p-6">
          <div className="flex items-center gap-2 mb-3"><Shield className="w-5 h-5 text-primary" /><h2 className="font-semibold">Protected Paths</h2></div>
          <p className="text-sm text-muted-foreground">.env, secrets/, key files</p>
        </div>
        <div className="neu-card p-6">
          <div className="flex items-center gap-2 mb-3"><KeyRound className="w-5 h-5 text-[rgb(21,128,61)]" /><h2 className="font-semibold">Secrets Found</h2></div>
          <p className="text-3xl font-bold text-foreground">0</p>
        </div>
        <div className="neu-card p-6">
          <div className="flex items-center gap-2 mb-3"><Ban className="w-5 h-5 text-destructive" /><h2 className="font-semibold">Blocked Commits</h2></div>
          <p className="text-3xl font-bold text-foreground">0</p>
        </div>
      </div>

      <div className="neu-card p-6">
        <h2 className="font-semibold mb-3">Recent Safety Events</h2>
        <div className="neu-section rounded-neu-sm p-4 text-sm text-muted-foreground">No safety events in this session.</div>
      </div>
    </div>
  )
}
