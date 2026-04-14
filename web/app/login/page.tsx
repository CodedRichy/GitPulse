'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: queryError } = await supabase
        .from('accounts')
        .select('*')
        .eq('email', email)
        .single();

      if (queryError) throw queryError;

      if (data && data.password_hash === password) {
        await supabase
          .from('accounts')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id);

        localStorage.setItem('gitpulse_session', JSON.stringify({ accountId: data.id, email: data.email, apiKey: data.api_key }));
        window.location.href = '/settings';
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 selection:bg-stone-200 dark:selection:bg-stone-700">
      <div className="w-full max-w-[400px] flex flex-col">
        
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block text-2xl font-serif text-foreground mb-6">
            Git<span className="text-stone-400 dark:text-stone-500 italic">Pulse</span>
          </Link>
          <h1 className="text-3xl font-serif font-medium text-foreground tracking-tight mb-2">Welcome back</h1>
          <p className="text-stone-500 dark:text-stone-400 font-light text-[15px]">
            Please enter your details to sign in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-transparent border border-stone-200 dark:border-stone-800 rounded-lg text-foreground placeholder:text-stone-400 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors shadow-sm"
              placeholder="name@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-transparent border border-stone-200 dark:border-stone-800 rounded-lg text-foreground placeholder:text-stone-400 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors shadow-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 mt-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium shadow-sm disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200 dark:border-stone-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-stone-400">or</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => console.log('GitHub OAuth')}
            className="w-full px-4 py-3 bg-transparent border border-stone-200 dark:border-stone-800 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors flex items-center justify-center gap-3 text-foreground font-medium shadow-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        <p className="mt-8 text-center text-[15px] text-stone-500 dark:text-stone-400 font-light">
          Don't have an account?{' '}
          <Link href="/register" className="text-foreground hover:underline font-medium decoration-stone-300 underline-offset-4">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  );
}
