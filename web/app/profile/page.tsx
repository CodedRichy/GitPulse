'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { useSession } from '@/lib/session';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (user) {
      fetchAnalytics();
    }
  }, [user, isAuthenticated, sessionLoading, router]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  if (sessionLoading || !user) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center font-mono text-emerald-500 animate-pulse">
        <span className="text-xl tracking-[0.5em] uppercase mb-4">Loading_Profile</span>
        <div className="w-48 h-1 bg-stone-900 rounded-full overflow-hidden">
           <div className="h-full bg-emerald-500 animate-[loading_2s_infinite]" style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-64 pb-24">
        <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6 px-1">User_Identity</h2>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase">Profile</h1>
           </div>
           <Link href="/settings" className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-white transition-colors pb-1 border-b border-stone-900 hover:border-white">
             Configure_Settings
           </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
           {/* PROFILE CARD */}
           <div className="glass-panel p-8 rounded-3xl border-stone-800 text-center">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.github_login || 'User'}
                  className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-emerald-500/30"
                />
              ) : (
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 flex items-center justify-center border border-emerald-500/30">
                   <span className="text-4xl font-bold text-emerald-400">
                     {user.github_login?.charAt(0).toUpperCase() || 'G'}
                   </span>
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{user.name || user.github_login || 'User'}</h3>
              <p className="text-stone-500 text-sm mb-6">{user.email || 'N/A'}</p>
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-stone-600 uppercase tracking-widest">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <span>Active</span>
              </div>
              {user.github_login && (
                <a 
                  href={`https://github.com/${user.github_login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  @{user.github_login}
                </a>
              )}
           </div>

           {/* GITPULSE INFO */}
           <div className="glass-panel p-8 rounded-3xl border-stone-800">
              <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-6 border-b border-stone-900 pb-4">GitPulse_Account</h3>
              <div className="space-y-4">
                 <InfoRow label="GitHub Login" value={user.github_login || 'N/A'} />
                 <InfoRow label="Display Name" value={user.name || 'N/A'} />
                 <InfoRow label="Email" value={user.email || 'N/A'} />
                 <InfoRow label="GitHub ID" value={user.github_id ? `#${user.github_id}` : 'N/A'} />
                 <InfoRow label="Current Tier" value={user.tier ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1) : 'Free'} />
              </div>
           </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="glass-panel p-8 rounded-3xl border-stone-800">
           <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-8 border-b border-stone-900 pb-6">Quick_Actions</h3>
           <div className="grid md:grid-cols-3 gap-4">
              <Link href="/dashboard" className="block w-full py-4 px-6 bg-stone-900/50 border border-stone-800 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white hover:border-stone-700 transition-all text-center">
                 Dashboard
              </Link>
              <Link href="/settings" className="block w-full py-4 px-6 bg-stone-900/50 border border-stone-800 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white hover:border-stone-700 transition-all text-center">
                 Settings
              </Link>
              <Link href="/subscription" className="block w-full py-4 px-6 bg-stone-900/50 border border-stone-800 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white hover:border-stone-700 transition-all text-center">
                 Subscription
              </Link>
              <Link href="/docs" className="block w-full py-4 px-6 bg-stone-900/50 border border-stone-800 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white hover:border-stone-700 transition-all text-center">
                 Documentation
              </Link>
              <Link href="/support" className="block w-full py-4 px-6 bg-stone-900/50 border border-stone-800 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white hover:border-stone-700 transition-all text-center">
                 Support
              </Link>
              <a 
                href="https://github.com/CodedRichy/GitPulse"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 px-6 bg-stone-900/50 border border-stone-800 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white hover:border-stone-700 transition-all text-center"
              >
                 GitHub Repo
              </a>
           </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-stone-900/50 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{label}</span>
      <span className="text-sm text-stone-300 font-mono">{value}</span>
    </div>
  );
}
