'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Tier, getTierBadge, canUseFeature } from '@/lib/tier';
import { Analytics, TelemetryRecord } from '@/lib/telemetry-client';
import { AreaChart, BarChart } from '@/components/charts';
import { ActivityHeatmap, StatsCard } from '@/components/activity-heatmap';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

interface DashboardData {
  analytics: Analytics;
  recentRuns: TelemetryRecord[];
  tier: Tier;
}

interface StatsData {
  stats: {
    totalCommits: number;
    aiAssistedCommits: number;
    manualCommits: number;
    aiAssistedPercentage: number;
    totalCommands: number;
    avgQualityScore: number;
    qualityPassRate: number;
    totalIssuesCaught: number;
    criticalIssuesCaught: number;
    linesChanged: number;
    filesChanged: number;
    estimatedTimeSavedMinutes: number;
    activeDays: number;
    currentStreak: number;
    longestStreak: number;
  };
  heatmap: Array<{ date: string; count: number; intensity: number }>;
}

// Fetcher for cloud telemetry (transforms to DashboardData format)
const cloudFetcher = async (url: string): Promise<DashboardData> => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch');
  
  const data = await response.json();
  
  // Transform cloud API response to DashboardData format
  return {
    analytics: data.analytics,
    recentRuns: (data.runs || []).map((run: any) => ({
      timestamp: run.timestamp,
      branch: run.branch || 'unknown',
      commitHash: run.commit_hash,
      author: undefined,
      score: run.score,
      gates: run.gates || {},
      issues: run.total_issues,
      issuesBySeverity: {
        critical: run.critical_issues,
        high: run.high_issues,
        medium: run.medium_issues,
        low: run.low_issues,
      },
      passed: run.passed,
      duration: run.duration_ms,
    })),
    tier: data.analytics?.contributors ? 'team' : 'pro',
  };
};

// Fetcher for local CLI (already in correct format)
const localFetcher = (url: string) => fetch(url).then(r => r.json());

function DashboardContent() {
  const searchParams = useSearchParams();
  const localPort = searchParams.get('local');
  const isLocalMode = !!localPort;
  const [days, setDays] = useState(30);

  // Cloud telemetry API (reads from Supabase)
  // Local mode overrides to direct CLI server when running
  const apiUrl = isLocalMode 
    ? `http://localhost:${localPort}/api/analytics?days=${days}`
    : `/api/telemetry?days=${days}`;

  // Use appropriate fetcher based on mode
  const fetcher = isLocalMode ? localFetcher : cloudFetcher;

  const { data, error, isLoading } = useSWR<DashboardData>(apiUrl, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  // Fetch productivity stats
  const { data: statsData } = useSWR<StatsData>(
    !isLocalMode ? `/api/stats?period=${days}` : null,
    (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    { refreshInterval: 60000 } // Stats refresh every minute
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center font-mono text-emerald-500 animate-pulse">
        <span className="text-xl tracking-[0.5em] uppercase mb-4">Initialising_Pulse</span>
        <div className="w-48 h-1 bg-stone-900 rounded-full overflow-hidden">
           <div className="h-full bg-emerald-500 animate-[loading_2s_infinite]" style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = isLocalMode 
      ? 'Local node not detected. Start "gitpulse dashboard" in your CLI.'
      : error instanceof Error ? error.message : 'Failed to load analytics';
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-6 text-center grainy">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-8 pulse-glow border border-red-500/20">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-amber-500 mb-4 uppercase tracking-tighter">Connection Fault</h2>
        <p className="text-stone-500 max-w-sm font-light mb-12 leading-relaxed">{errorMessage}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-10 py-3 bg-white text-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 hover:text-white transition-all"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { analytics, recentRuns, tier } = data;
  const tierBadge = getTierBadge(tier);
  const hasAnalytics = canUseFeature(tier, 'analytics');

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-40 pb-24">
        {/* DASHBOARD HEADER */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">Repo_Intelligence</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tierBadge.color.replace('bg-', 'bg-opacity-10 text-').replace('text-white', 'text-emerald-400')}`}>
                {tierBadge.text}
              </span>
            </div>
            <p className="text-stone-500 font-light text-lg">
              Health metrics for <span className="text-emerald-400 font-mono font-bold tracking-widest">{days}D</span> historical data.
            </p>
          </div>
          <div className="flex bg-stone-900/50 p-1.5 rounded-xl border border-stone-800">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                  days === d ? 'bg-stone-800 text-white shadow-xl' : 'text-stone-500 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {!hasAnalytics ? (
          <div className="p-20 glass-panel rounded-3xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] -z-10" />
            <div className="text-5xl mb-12 animate-bounce">📈</div>
            <h3 className="text-3xl font-bold mb-6 tracking-tight uppercase">Elevate Your Intelligence</h3>
            <p className="text-stone-500 font-light max-w-md mx-auto mb-10 leading-relaxed">
              Unlock the full telemetry suite: Team performance heatmap, security trend analysis, and convention drift detection.
            </p>
            <Link href="/subscription" className="px-12 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 hover:text-white transition-all shadow-2xl shadow-emerald-500/10">
              Upgrade System
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* PRIMARY ANALYTICS */}
            <div className="lg:col-span-8 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <MetricCard title="Health_Score" value={`${analytics.averageScore}%`} trend={analytics.scoreTrend} />
                 <MetricCard title="Pass_Rate" value={`${analytics.passRate}%`} trend={2} />
                 <MetricCard title="Security_Alerts" value={analytics.topIssues.reduce((acc, i) => acc + i.count, 0).toString()} trend={-12} warning={true} />
              </div>

              {/* PRODUCTIVITY ANALYTICS */}
              {statsData?.stats && (
                <div className="glass-panel p-10 rounded-3xl overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Pulse_Productivity</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                        {statsData.stats.currentStreak} day streak
                      </span>
                    </div>
                  </div>
                  
                  {/* Heatmap */}
                  <div className="mb-8">
                    <p className="text-sm text-stone-400 mb-4">{statsData.stats.totalCommits} commits in the last {days} days</p>
                    <ActivityHeatmap data={statsData.heatmap} days={days} />
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatsCard 
                      label="AI Commits" 
                      value={statsData.stats.aiAssistedCommits}
                      subtext={`${statsData.stats.aiAssistedPercentage}% of total`}
                      trend="up"
                      trendValue={`+${statsData.stats.aiAssistedPercentage}%`}
                    />
                    <StatsCard 
                      label="Quality Score" 
                      value={`${statsData.stats.avgQualityScore}%`}
                      subtext={`${statsData.stats.qualityPassRate}% pass rate`}
                      trend={statsData.stats.avgQualityScore > 80 ? 'up' : 'neutral'}
                    />
                    <StatsCard 
                      label="Issues Caught" 
                      value={statsData.stats.totalIssuesCaught}
                      subtext={`${statsData.stats.criticalIssuesCaught} critical`}
                      trend="down"
                      trendValue="Prevented"
                    />
                    <StatsCard 
                      label="Time Saved" 
                      value={`${Math.round(statsData.stats.estimatedTimeSavedMinutes / 60)}h`}
                      subtext={`${statsData.stats.estimatedTimeSavedMinutes} minutes`}
                      trend="up"
                      trendValue="AI efficiency"
                    />
                  </div>
                </div>
              )}

              {/* MAIN CHART */}
              <div className="glass-panel p-10 rounded-3xl overflow-hidden relative">
                <div className="flex justify-between items-center mb-12">
                   <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Quality_Telemetric_Line</h3>
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                         Consistency %
                      </div>
                   </div>
                </div>
                <AreaChart 
                  data={[82, 85, 84, 88, 92, 90, 89, 94, 95, 93, 96]} 
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                />
              </div>

              {/* ACTIVITY LOG */}
              <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-stone-800/50 flex justify-between items-center">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.3em] text-stone-500">Live_Analysis_Log</h3>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-white transition-colors">Open Observer</button>
                </div>
                <div className="divide-y divide-stone-900">
                  {recentRuns.map((run, i) => (
                    <div key={i} className="p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-6">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          run.passed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                        }`}>
                          {run.passed ? '✦' : '!'}
                        </div>
                        <div>
                          <p className="font-bold text-[15px]">{run.author}</p>
                          <div className="flex items-center gap-3 text-[10px] text-stone-600 font-mono mt-0.5">
                            <span className="px-1.5 py-0.5 bg-stone-900 rounded text-emerald-500/80 border border-stone-800">{run.branch}</span>
                            <span>•</span>
                            <span className="uppercase">{new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold font-mono tracking-tighter">{run.score}%</p>
                        <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-stone-600">{run.issues} Faults Detected</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECONDARY ANALYTICS (SIDEBAR) */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white text-black p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-8">Gate_Integrity</h3>
                <div className="space-y-8">
                  {Object.entries(analytics.gateAverages).map(([gate, score]) => (
                    <div key={gate}>
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-3">
                        <span className="text-stone-500">{gate.replace(/-/g, '_')}</span>
                        <span>{score}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black transition-all duration-1000 ease-out" 
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-10 rounded-3xl">
                 <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-8">Fault_Categories</h3>
                 <BarChart 
                  data={analytics.topIssues.map(i => i.count)} 
                  labels={analytics.topIssues.map(i => i.category)}
                  color="#FBBF24"
                />
              </div>

              <div className="p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.03] pulse-glow">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-400 mb-6 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                   System_Recommendation
                </h4>
                <p className="text-sm text-stone-400 leading-relaxed font-light mb-8 italic">
                  Security gate "Secrets" has detected 3 potential leaks in <code className="text-emerald-400 bg-stone-900 px-1 rounded mx-1">feature/auth</code>. Automatic lockdown in effect.
                </p>
                <button className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-[#09090B] bg-emerald-400 rounded-xl hover:bg-white transition-all shadow-xl shadow-emerald-500/10">
                  Execute Review
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center font-mono text-emerald-500 animate-pulse">
        <span className="text-xl tracking-[0.5em] uppercase mb-4">Initialising_Pulse</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function MetricCard({ title, value, trend, warning }: { title: string, value: string, trend: number | string, warning?: boolean }) {
  const isPositive = typeof trend === 'number' && trend > 0;
  return (
    <div className="glass-panel p-8 rounded-3xl group hover:border-emerald-500/30 transition-all cursor-default relative overflow-hidden">
      <div className="flex justify-between items-start mb-6">
         <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-600 font-bold group-hover:text-stone-400 transition-colors">{title}</h4>
         <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
            warning ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
            isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            'bg-stone-900 text-stone-600 border-stone-800'
          }`}>
          {isPositive ? '↑' : '↓'}{Math.abs(Number(trend))}{typeof trend === 'number' ? '%' : ''}
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tracking-tighter group-hover:text-emerald-400 transition-colors uppercase">{value}</span>
      </div>
      {/* Decorative pulse line */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-emerald-400/30 group-hover:w-full transition-all duration-1000" />
    </div>
  );
}
