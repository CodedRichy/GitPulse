'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { ErrorBoundary } from '@/components/error-boundary';
import { useSession } from '@/lib/session';
import useSWR from 'swr';
import type { Team, TeamMemberWithUser } from '@/lib/team-types';

// API response includes myRole and team_members directly on team object
type TeamWithMembers = Team & {
  myRole: string;
  team_members: TeamMemberWithUser[];
};

function TeamLayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const teamId = params.id as string;
  const { user } = useSession();

  const { data, isLoading } = useSWR<TeamWithMembers>(
    `/api/teams/${teamId}`,
    (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    { refreshInterval: 30000 }
  );

  const tabs = [
    { id: 'overview', label: 'Overview', href: `/dashboard/teams/${teamId}` },
    { id: 'analytics', label: 'Analytics', href: `/dashboard/teams/${teamId}/analytics` },
    { id: 'members', label: 'Members', href: `/dashboard/teams/${teamId}/members` },
    { id: 'settings', label: 'Settings', href: `/dashboard/teams/${teamId}/settings` },
  ];

  const activeTab = tabs.find(t => pathname === t.href)?.id || 'overview';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center font-mono text-emerald-500 animate-pulse">
        <span className="text-xl tracking-[0.5em] uppercase mb-4">Loading_Team</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-6 text-center grainy">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-8 border border-red-500/20">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-red-500 mb-4 uppercase tracking-tighter">Team Not Found</h2>
      </div>
    );
  }

  const team = data;
  const members = team.team_members || [];

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24">
        {/* TEAM HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/dashboard/teams"
              className="text-stone-500 hover:text-emerald-400 transition-colors text-sm font-mono"
            >
              ← Back to Teams
            </Link>
          </div>
          
          <div className="flex items-center gap-6 mb-6">
            {team.logo_url ? (
              <img 
                src={team.logo_url} 
                alt={team.name}
                className="w-20 h-20 rounded-2xl object-cover border border-stone-800"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-4xl font-bold text-emerald-400">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase">{team.name}</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-stone-400 border border-stone-700">
                  {team.tier}
                </span>
              </div>
              <p className="text-stone-500 font-mono text-sm mt-2">@{team.slug}</p>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex border-b border-stone-800">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-8 py-4 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-emerald-400 border-emerald-400'
                    : 'text-stone-500 border-transparent hover:text-stone-300'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="mt-8">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <TeamLayoutContent>{children}</TeamLayoutContent>
    </ErrorBoundary>
  );
}
