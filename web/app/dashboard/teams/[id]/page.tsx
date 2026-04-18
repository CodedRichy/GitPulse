'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import type { Team, TeamMemberWithUser, TeamSettings, TeamMemberRole } from '@/lib/team-types';
import { AreaChart, BarChart } from '@/components/charts';

interface TeamApiResponse extends Team {
  myRole: TeamMemberRole;
  team_members: TeamMemberWithUser[];
  team_settings?: TeamSettings;
}

export default function TeamOverviewPage() {
  const params = useParams();
  const teamId = params.id as string;

  const { data: teamData, isLoading } = useSWR<TeamApiResponse>(
    `/api/teams/${teamId}`,
    (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    { refreshInterval: 60000 }
  );

  // Placeholder stats until analytics endpoint is implemented
  const stats = {
    totalCommits: 0,
    averageScore: 85,
    passRate: 92,
    totalIssues: 12,
    secretsPrevented: 3,
  };
  const recentActivity: Array<any> = [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 font-mono text-emerald-500 animate-pulse">
        <span className="tracking-[0.3em] uppercase">Loading_Overview</span>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="text-center py-20 text-stone-500">
        Failed to load team overview
      </div>
    );
  }

  const team = teamData;
  const members = team?.team_members || [];

  return (
    <div className="space-y-8">
      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">Health_Score</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter">{stats.averageScore}%</span>
            <span className="text-emerald-400 text-sm">avg</span>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">Pass_Rate</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter">{stats.passRate}%</span>
            <span className="text-emerald-400 text-sm">commits</span>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">Total_Commits</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter">{stats.totalCommits}</span>
            <span className="text-stone-500 text-sm">this month</span>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">Secrets_Blocked</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter text-red-400">{stats.secretsPrevented}</span>
            <span className="text-emerald-400 text-sm">prevented</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MAIN CHART */}
        <div className="lg:col-span-2 glass-panel p-10 rounded-3xl">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-8">Quality_Trend_30D</h3>
          <AreaChart 
            data={[82, 85, 84, 88, 92, 90, 89, 94, 95, 93, 96, 97]} 
            labels={['1', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30']}
          />
        </div>

        {/* MEMBERS PREVIEW */}
        <div className="glass-panel p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Team_Members</h3>
            <span className="text-emerald-400 font-mono text-sm">{members.length}/{team.seats}</span>
          </div>
          
          <div className="space-y-4">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                {member.user.avatar_url ? (
                  <img 
                    src={member.user.avatar_url} 
                    alt={member.user.name || ''}
                    className="w-10 h-10 rounded-xl object-cover border border-stone-800"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center">
                    <span className="text-sm font-bold text-stone-400">
                      {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{member.user.name || member.user.email}</p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider">{member.role}</p>
                </div>
              </div>
            ))}
          </div>

          {members.length > 5 && (
            <p className="text-center text-stone-500 text-xs mt-4">
              +{members.length - 5} more members
            </p>
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="p-8 border-b border-stone-800/50">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.3em] text-stone-500">Recent_Activity</h3>
        </div>
        <div className="divide-y divide-stone-900">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              No recent activity
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{activity.action}</p>
                    <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                      {activity.user} • {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-stone-400">{activity.details}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
