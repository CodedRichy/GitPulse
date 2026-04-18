'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import type { TeamAnalyticsResponse } from '@/lib/team-types';
import { AreaChart, BarChart } from '@/components/charts';

export default function TeamAnalyticsPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [days, setDays] = useState(30);

  const { data, isLoading } = useSWR<TeamAnalyticsResponse>(
    `/api/teams/${teamId}/analytics?days=${days}`,
    (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 font-mono text-emerald-500 animate-pulse">
        <span className="tracking-[0.3em] uppercase">Loading_Analytics</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-stone-500">
        Failed to load team analytics
      </div>
    );
  }

  const { summary, trends, byMember, byRepo, byGate } = data;

  return (
    <div className="space-y-8">
      {/* DATE RANGE SELECTOR */}
      <div className="flex justify-end">
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

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">Total_Runs</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter">{summary.totalRuns}</span>
            <span className={`text-sm ${trends.volumeTrend > 0 ? 'text-emerald-400' : 'text-stone-500'}`}>
              {trends.volumeTrend > 0 ? '↑' : '↓'} {Math.abs(trends.volumeTrend)}%
            </span>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">Avg_Score</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter">{summary.averageScore}%</span>
            <span className={`text-sm ${trends.scoreTrend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trends.scoreTrend > 0 ? '↑' : '↓'} {Math.abs(trends.scoreTrend)}%
            </span>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">Pass_Rate</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter">{summary.passRate}%</span>
            <span className={`text-sm ${trends.passRateTrend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trends.passRateTrend > 0 ? '↑' : '↓'} {Math.abs(trends.passRateTrend)}%
            </span>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">Secrets_Prevented</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter text-emerald-400">{summary.secretsPrevented}</span>
            <span className="text-emerald-400 text-sm">blocked</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BY MEMBER */}
        <div className="glass-panel p-8 rounded-3xl">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-8">Performance_By_Member</h3>
          <div className="space-y-4">
            {byMember.map((member) => (
              <div key={member.userId} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-stone-400">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-sm truncate">{member.name}</p>
                    <span className="text-emerald-400 font-mono text-sm">{member.averageScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all" 
                      style={{ width: `${member.averageScore}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BY REPO */}
        <div className="glass-panel p-8 rounded-3xl">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-8">Repository_Rankings</h3>
          <div className="space-y-4">
            {byRepo.map((repo) => (
              <div key={repo.repoName} className="p-4 bg-stone-900/50 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm font-mono">{repo.repoName}</p>
                  <span className="text-emerald-400 font-mono text-sm">{repo.averageScore}%</span>
                </div>
                <p className="text-[10px] text-stone-500 mb-2">{repo.runs} runs</p>
                {repo.topIssues.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {repo.topIssues.slice(0, 3).map((issue, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[9px] rounded border border-red-500/20">
                        {issue}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BY GATE */}
      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-8">Quality_Gate_Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(byGate).map(([gate, stats]) => (
            <div key={gate} className="p-6 bg-stone-900/50 rounded-2xl border border-stone-800">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-sm uppercase tracking-wider">{gate.replace(/-/g, '_')}</p>
                <span className="text-emerald-400 font-mono text-sm">{stats.passRate}%</span>
              </div>
              <div className="space-y-2 text-[10px] text-stone-500">
                <div className="flex justify-between">
                  <span>Runs</span>
                  <span className="font-mono text-stone-400">{stats.runs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failures</span>
                  <span className="font-mono text-red-400">{stats.failures}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
