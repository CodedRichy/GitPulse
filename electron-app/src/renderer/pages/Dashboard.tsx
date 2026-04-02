import { useState, useEffect } from 'react'
import { Activity, GitCommit, Zap, CheckCircle2, TrendingUp, Github, Clock, AlertCircle, FolderGit2 } from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import StatCard from '../components/ui/StatCard'

export default function Dashboard({ isMonitoring }: { isMonitoring?: boolean }) {
  const { analytics, loading } = useAnalytics()
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'success'|'error'}[]>([])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onPythonOutput((output: string) => {
        setLogs(prev => [{
          time: new Date().toLocaleTimeString([], { hour12: false }),
          msg: output,
          type: (output.toLowerCase().includes('success') ? 'success' : 'info') as 'info' | 'success' | 'error'
        }, ...prev].slice(0, 50))
      })
      window.electronAPI.onPythonError((error: string) => {
        setLogs(prev => [{
          time: new Date().toLocaleTimeString([], { hour12: false }),
          msg: error,
          type: 'error' as 'info' | 'success' | 'error'
        }, ...prev].slice(0, 50))
      })
    }
  }, [])

  const stats = analytics || {
    total_commits: 0,
    ai_commits: 0,
    ai_percentage: 0,
    repos_tracked: 0,
    total_pushes: 0,
    success_rate: 100
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          Overview
          {isMonitoring && (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
          )}
        </h1>
        <p className="text-muted-foreground text-sm">Real-time system status and AI automation metrics</p>
      </div>

      {/* Main Stats Grid - Neumorphic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={GitCommit}
          title="Total Commits"
          value={stats.total_commits}
          trend="+12% this week"
          color="primary"
          loading={loading}
        />
        <StatCard
          icon={Zap}
          title="AI Generated"
          value={stats.ai_commits}
          trend={`${stats.ai_percentage}% of total`}
          color="secondary"
          loading={loading}
        />
        <StatCard
          icon={CheckCircle2}
          title="Success Rate"
          value={`${stats.success_rate}%`}
          trend="0 failed pushes"
          color="success"
          loading={loading}
        />
        <StatCard
          icon={FolderGit2}
          title="Active Repos"
          value={stats.repos_tracked}
          trend="All synced"
          color="primary"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Health & AI Status (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* AI Performance Panel */}
          <div className="neu-card-lg p-6 relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6 relative">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                AI Performance Metrics
              </h2>
              <div className="px-3 py-1 rounded-neu-sm neu-section text-xs font-medium text-primary">
                Model: Claude 3.5 Sonnet
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6 relative">
              <div className="p-4 rounded-neu-sm neu-button flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full neu-button flex items-center justify-center mb-3">
                  <Zap className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.ai_percentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">Automation Rate</p>
              </div>
              
              <div className="p-4 rounded-neu-sm neu-button flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full neu-button flex items-center justify-center mb-3">
                  <Github className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.total_pushes}</p>
                <p className="text-xs text-muted-foreground mt-1">Successful Pushes</p>
              </div>
              
              <div className="p-4 rounded-neu-sm neu-button flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full neu-button flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">1.2s</p>
                <p className="text-xs text-muted-foreground mt-1">Avg Commit Time</p>
              </div>
            </div>
          </div>

          {/* Active Repositories Preview */}
          <div className="neu-card-lg p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-foreground" />
              Recently Active Repositories
            </h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-neu-sm neu-button hover:shadow-neu-sm-hover transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full neu-button flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Github className="w-4 h-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">project-repo-{i}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Last synced 2m ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="w-3 h-3" /> Clean
                    </div>
                    <div className="w-px h-4 bg-black/5" />
                    <span className="text-xs font-mono text-muted-foreground">main</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Activity Feed (1/3 width) */}
        <div className="neu-card-lg p-6 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Live Activity
            </h2>
            {isMonitoring && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-success animate-pulse">Live</span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 rounded-neu-sm neu-section p-4 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center neu-empty rounded-neu-sm p-6">
                <div className="w-16 h-16 rounded-full neu-button flex items-center justify-center mb-4 animate-pulse">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-2">System Ready</p>
                <p className="text-xs text-muted-foreground mb-4">Start monitoring to see real-time activity</p>
                <button 
                  onClick={() => window.electronAPI?.startMonitoring?.()}
                  className="px-4 py-2 neu-button rounded-neu-sm text-xs font-medium text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-300"
                >
                  Start Monitoring
                </button>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex gap-3 text-sm animate-slide-in opacity-0 group" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      log.type === 'success' ? 'bg-success glow-success' : 
                      log.type === 'error' ? 'bg-destructive glow-error' : 
                      'bg-primary glow-primary'
                    }`} />
                    {index !== logs.length - 1 && <div className="w-px h-full bg-black/5 mt-1" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <span className="text-[10px] font-mono text-muted-foreground mb-1 block group-hover:text-primary transition-colors">{log.time}</span>
                    <p className={`font-mono text-xs leading-relaxed ${
                      log.type === 'error' ? 'text-destructive' : 'text-foreground/90'
                    }`}>
                      {log.msg}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
