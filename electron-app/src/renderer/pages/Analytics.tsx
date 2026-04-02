import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Zap, AlertCircle } from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import Chart from '../components/Chart'
import StatCard from '../components/StatCard'

export default function Analytics() {
  const { analytics, loading, error } = useAnalytics()

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const stats = analytics || {}

  // Prepare chart data
  const commitTrendData = [
    { name: 'Mon', commits: 12, ai: 8 },
    { name: 'Tue', commits: 19, ai: 15 },
    { name: 'Wed', commits: 15, ai: 12 },
    { name: 'Thu', commits: 22, ai: 18 },
    { name: 'Fri', commits: 18, ai: 14 },
    { name: 'Sat', commits: 8, ai: 6 },
    { name: 'Sun', commits: 5, ai: 4 },
  ]

  const repoActivityData = Object.entries(stats.repo_stats || {}).map(([name, data]: [string, any]) => ({
    name,
    commits: data.commits || 0,
    pushes: data.pushes || 0,
  }))

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics & Insights</h1>
        <p className="text-muted-foreground mt-1">Detailed productivity metrics and trends</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={BarChart3}
          title="Total Activity"
          value={stats.total_commits || 0}
          subtitle="commits tracked"
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={Zap}
          title="AI Efficiency"
          value={`${stats.ai_percentage || 0}%`}
          subtitle="AI-generated commits"
          color="purple"
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          title="Success Rate"
          value={`${stats.success_rate || 100}%`}
          subtitle="successful pushes"
          color="green"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          title="Weekly Commit Trend"
          type="line"
          data={commitTrendData}
          loading={loading}
          height={300}
        />
        <Chart
          title="Repository Activity"
          type="bar"
          data={repoActivityData}
          loading={loading}
          height={300}
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commit Statistics */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Commit Statistics</h2>
          <div className="space-y-4">
            <StatRow label="Total Commits" value={stats.total_commits || 0} />
            <StatRow label="AI-Generated" value={stats.ai_commits || 0} />
            <StatRow label="Manual Commits" value={(stats.total_commits || 0) - (stats.ai_commits || 0)} />
            <StatRow label="Total Pushes" value={stats.total_pushes || 0} />
            <StatRow label="Failed Pushes" value={stats.failed_pushes || 0} />
          </div>
        </div>

        {/* Repository Stats */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Repository Stats</h2>
          <div className="space-y-4">
            <StatRow label="Repos Tracked" value={stats.repos_tracked || 0} />
            <StatRow label="Days Active" value={stats.days_active || 0} />
            <StatRow label="Avg Commits/Day" value={stats.avg_commits_per_day || 0} />
            <StatRow label="Most Active Repo" value="GitPulse" isText />
          </div>
        </div>
      </div>

      {/* AI Provider Performance */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          AI Provider Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProviderCard name="Ollama" requests={stats.ai_commits || 0} success={stats.ai_percentage || 100} />
          <ProviderCard name="OpenAI" requests={0} success={0} />
          <ProviderCard name="Anthropic" requests={0} success={0} />
        </div>
      </div>

      {/* Error Analysis */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Error Analysis
        </h2>
        <div className="space-y-3">
          {stats.failed_pushes > 0 ? (
            <>
              <ErrorRow type="Network Errors" count={Math.floor((stats.failed_pushes || 0) * 0.6)} />
              <ErrorRow type="Authentication" count={Math.floor((stats.failed_pushes || 0) * 0.3)} />
              <ErrorRow type="Merge Conflicts" count={Math.floor((stats.failed_pushes || 0) * 0.1)} />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No errors recorded. Great job! 🎉</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatRowProps {
  label: string
  value: string | number
  isText?: boolean
}

function StatRow({ label, value, isText }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-semibold ${isText ? 'text-sm' : 'text-lg'}`}>{value}</span>
    </div>
  )
}

interface ProviderCardProps {
  name: string
  requests: number
  success: number
}

function ProviderCard({ name, requests, success }: ProviderCardProps) {
  const isActive = requests > 0

  return (
    <div className={`p-4 rounded-lg border ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/50'}`}>
      <h3 className="font-semibold mb-2">{name}</h3>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Requests: <span className="font-semibold text-foreground">{requests}</span></p>
        <p className="text-sm text-muted-foreground">Success: <span className="font-semibold text-green-500">{success}%</span></p>
      </div>
    </div>
  )
}

interface ErrorRowProps {
  type: string
  count: number
}

function ErrorRow({ type, count }: ErrorRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded">
      <span className="text-sm">{type}</span>
      <span className="font-semibold text-red-500">{count}</span>
    </div>
  )
}
