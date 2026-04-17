'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/session', {
          credentials: 'include',
        });
        if (response.ok) {
          router.push('/dashboard');
        }
      } catch {
        // Not logged in, stay on login page
      }
    };
    checkSession();
  }, [router]);

  const handleGitHubLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
      if (!clientId) {
        throw new Error('GitHub OAuth not configured');
      }

      const state = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('github_oauth_state', state);

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${window.location.origin}/auth/github/callback`,
        scope: 'read:user,user:email',
        state,
        response_type: 'code',
      });

      const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col items-center justify-center p-6 grainy">
      {/* BACKGROUND GLOW */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[440px] relative">
        <div className="mb-12 text-center">
          <Link href="/" className="inline-block mb-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <Image
                src="/GitPulseLogo.png"
                alt="GitPulse Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 uppercase">Identity_Check</h1>
          <p className="text-stone-500 font-light text-sm tracking-wide">
            Sign in to view your CLI dashboard and team analytics
          </p>
          <p className="mt-3 text-xs text-stone-600 font-light">
            Requires GitPulse CLI installed locally
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-8 animate-in fade-in slide-in-from-top-2">
            <p className="text-xs text-red-500 font-mono text-center uppercase tracking-widest">{error}</p>
          </div>
        )}

        <div className="glass-panel p-10 rounded-3xl border-stone-800 shadow-2xl">
          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={loading}
            className="w-full px-6 py-4 bg-white text-black rounded-xl hover:bg-emerald-400 hover:text-white transition-all flex items-center justify-center gap-4 font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-3">
                 <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                 Connecting_Hub
              </span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Initialise Session
              </>
            )}
          </button>
          
          <div className="mt-10 pt-10 border-t border-stone-800 text-center">
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600 mb-6">Security_Verification</p>
             <div className="flex justify-center gap-8 text-[9px] text-stone-400 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                   OAuth 2.0
                </span>
                <span className="flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                   SSL Encryption
                </span>
             </div>
          </div>
        </div>

        <p className="mt-12 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600 leading-relaxed max-w-[280px] mx-auto">
          By proceeding, you agree to our{' '}
          <Link href="/terms" className="text-stone-400 hover:text-emerald-400 transition-colors">System_Terms</Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-stone-400 hover:text-emerald-400 transition-colors">Privacy_Protocol</Link>
        </p>
      </div>
    </div>
  );
}
