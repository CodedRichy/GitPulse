'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('user@example.com');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    console.log('Saving settings:', { apiKey, email });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center selection:bg-stone-200 dark:selection:bg-stone-700">
      {/* Navigation */}
      <nav className="w-full flex items-center justify-between px-6 py-8 max-w-5xl">
        <Link href="/" className="text-xl tracking-tight font-serif font-medium text-foreground">
          Git<span className="text-stone-400 dark:text-stone-500 italic">Pulse</span>
        </Link>
        <div className="flex items-center gap-8 text-sm text-stone-500 dark:text-stone-400">
          <Link 
            href="/subscription" 
            className="hover:text-foreground transition-colors mix-blend-multiply dark:mix-blend-normal"
          >
            Subscription
          </Link>
          <Link 
            href="/login" 
            className="hover:text-foreground transition-colors mix-blend-multiply dark:mix-blend-normal"
          >
            Sign out
          </Link>
        </div>
      </nav>

      <main className="w-full max-w-3xl px-6 py-16 flex flex-col flex-1">
        <h1 className="font-serif text-4xl text-foreground mb-12 font-medium tracking-tight">
          Settings
        </h1>

        <div className="flex flex-col gap-12">
          
          {/* Account Section */}
          <section className="flex flex-col md:flex-row md:items-start gap-8 md:gap-16 border-b border-stone-200/50 dark:border-stone-800/50 pb-12">
            <div className="md:w-1/3">
              <h2 className="text-lg font-serif font-medium text-foreground mb-2">
                Account
              </h2>
              <p className="text-stone-500 dark:text-stone-400 text-[15px] font-light leading-relaxed">
                Manage your primary identity and communication contact.
              </p>
            </div>
            <div className="md:w-2/3 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full max-w-[320px] px-4 py-2.5 bg-transparent border border-stone-200 dark:border-stone-800 rounded-lg text-foreground focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors shadow-sm"
                />
              </div>
            </div>
          </section>

          {/* API Key Section */}
          <section className="flex flex-col md:flex-row md:items-start gap-8 md:gap-16 border-b border-stone-200/50 dark:border-stone-800/50 pb-12">
            <div className="md:w-1/3">
              <h2 className="text-lg font-serif font-medium text-foreground mb-2">
                API Key
              </h2>
              <p className="text-stone-500 dark:text-stone-400 text-[15px] font-light leading-relaxed">
                Connect your local GitPulse CLI to our cloud features using your personal API key.
              </p>
            </div>
            <div className="md:w-2/3 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="apiKey" className="text-sm font-medium text-foreground">
                  Secret Key
                </label>
                <div className="flex max-w-[400px] gap-3">
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gp_..."
                    readOnly
                    className="flex-1 px-4 py-2.5 bg-stone-50 dark:bg-stone-800/20 border border-stone-200 dark:border-stone-800 rounded-lg text-foreground focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors shadow-sm"
                  />
                  <button
                    onClick={() => setApiKey('gp_' + Math.random().toString(36).substring(2, 34))}
                    className="px-4 py-2.5 border border-stone-200 dark:border-stone-800 text-foreground rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors font-medium shadow-sm whitespace-nowrap text-sm"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="flex flex-col md:flex-row md:items-start gap-8 md:gap-16 pb-12">
            <div className="md:w-1/3">
              <h2 className="text-lg font-serif font-medium text-foreground mb-2">
                Preferences
              </h2>
              <p className="text-stone-500 dark:text-stone-400 text-[15px] font-light leading-relaxed">
                Customize your web dashboard and email notification settings.
              </p>
            </div>
            <div className="md:w-2/3 flex flex-col gap-6 pt-1">
              <div className="flex items-center justify-between max-w-[400px]">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground text-sm">System Theme</span>
                  <span className="text-[13px] text-stone-500 dark:text-stone-400 mt-0.5">Match your system appearance</span>
                </div>
                <button className="w-11 h-6 bg-stone-200 dark:bg-stone-700 rounded-full relative transition-colors shadow-inner">
                  <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform dark:translate-x-5 shadow-sm"></span>
                </button>
              </div>
              <div className="flex items-center justify-between max-w-[400px]">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground text-sm">Email Updates</span>
                  <span className="text-[13px] text-stone-500 dark:text-stone-400 mt-0.5">Receive occasional product updates</span>
                </div>
                <button className="w-11 h-6 bg-stone-200 dark:bg-stone-700 rounded-full relative transition-colors shadow-inner">
                  <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></span>
                </button>
              </div>
            </div>
          </section>

          <div className="flex justify-end border-t border-stone-200/50 dark:border-stone-800/50 pt-8">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 bg-foreground text-background rounded-full hover:opacity-90 transition-opacity font-medium tracking-wide shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
