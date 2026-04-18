'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { ErrorBoundary } from '@/components/error-boundary';
import { useSession } from '@/lib/session';

interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  myRole: 'admin' | 'lead' | 'developer' | 'viewer';
  seats_used: number;
  tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

function TeamsListContent() {
  const router = useRouter();
  const { user } = useSession();

  const { data, error, isLoading } = useSWR<{ teams: Team[] }>(
    '/api/teams',
    (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    { refreshInterval: 30000 }
  );

  const teams = data?.teams || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center font-mono text-emerald-500 animate-pulse">
        <span className="text-xl tracking-[0.5em] uppercase mb-4">Loading_Teams</span>
        <div className="w-48 h-1 bg-stone-900 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 animate-[loading_2s_infinite]" style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-6 text-center grainy">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-8 pulse-glow border border-red-500/20">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-amber-500 mb-4 uppercase tracking-tighter">Connection Fault</h2>
        <p className="text-stone-500 max-w-sm font-light mb-12 leading-relaxed">Failed to load team registry</p>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-red-500/10 text-red-500 border-red-500/20',
      lead: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      developer: 'bg-stone-800 text-stone-400 border-stone-700',
      viewer: 'bg-stone-800 text-stone-500 border-stone-700'
    };
    const labels = { admin: 'Admin', lead: 'Lead', developer: 'Developer', viewer: 'Viewer' };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-40 pb-24">
        {/* HEADER */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">Team_Registry</h1>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {teams.length} Teams
              </span>
            </div>
            <p className="text-stone-500 font-light text-lg">
              Manage your organization workspaces and collaborate with your team
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/teams/new')}
            className="px-10 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 hover:text-white transition-all shadow-2xl shadow-white/5 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Team
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="glass-panel p-20 rounded-3xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] -z-10" />
            <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold mb-6 tracking-tight uppercase">No Teams Found</h3>
            <p className="text-stone-500 font-light max-w-md mx-auto mb-10 leading-relaxed">
              Create a team to start collaborating with your organization and share quality insights across repositories
            </p>
            <button
              onClick={() => router.push('/dashboard/teams/new')}
              className="px-12 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 hover:text-white transition-all shadow-2xl shadow-emerald-500/10"
            >
              Initialize First Team
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="glass-panel rounded-3xl p-8 cursor-pointer hover:border-emerald-500/30 transition-all group"
                onClick={() => router.push(`/dashboard/teams/${team.id}`)}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-stone-800"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <span className="text-2xl font-bold text-emerald-400">
                          {team.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-emerald-400 transition-colors">{team.name}</h3>
                      <p className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">@{team.slug}</p>
                    </div>
                  </div>
                  {getRoleBadge(team.myRole)}
                </div>

                {team.description && (
                  <p className="text-sm text-stone-400 font-light mb-6 line-clamp-2 leading-relaxed">
                    {team.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-stone-800/50">
                  <div className="flex items-center gap-3 text-sm text-stone-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="font-mono">{team.seats_used} members</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    View <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function TeamsPage() {
  return (
    <ErrorBoundary>
      <TeamsListContent />
    </ErrorBoundary>
  );
}
