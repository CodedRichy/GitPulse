'use client';

import Link from 'next/link';

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center selection:bg-stone-200 dark:selection:bg-stone-700">
      {/* Navigation */}
      <nav className="w-full flex items-center justify-between px-6 py-8 max-w-5xl">
        <Link href="/" className="text-xl tracking-tight font-serif font-medium text-foreground">
          Git<span className="text-stone-400 dark:text-stone-500 italic">Pulse</span>
        </Link>
        <div className="flex items-center gap-8 text-sm text-stone-500 dark:text-stone-400">
          <Link 
            href="/settings" 
            className="hover:text-foreground transition-colors mix-blend-multiply dark:mix-blend-normal"
          >
            Settings
          </Link>
          <Link 
            href="/login" 
            className="hover:text-foreground transition-colors mix-blend-multiply dark:mix-blend-normal"
          >
            Sign out
          </Link>
        </div>
      </nav>

      <main className="w-full max-w-5xl px-6 py-16 flex flex-col flex-1">
        <div className="mb-16">
          <h1 className="font-serif text-4xl text-foreground mb-4 font-medium tracking-tight">
            Plans &amp; Pricing
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-lg font-light">
            Simple, transparent pricing for developers and teams.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="flex flex-col p-8 border border-stone-200 dark:border-stone-800 rounded-2xl bg-transparent transition-colors hover:bg-stone-50/50 dark:hover:bg-stone-800/10">
            <h2 className="text-lg font-serif font-medium text-foreground mb-2">
              Free
            </h2>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-3xl font-serif text-foreground">$0</span>
              <span className="text-stone-500 dark:text-stone-400 text-sm">/month</span>
            </div>
            
            <ul className="flex flex-col gap-4 mb-8 flex-1">
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Basic commit generation
              </li>
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                100 commits/month
              </li>
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Local AI support
              </li>
            </ul>
            
            <button className="w-full px-4 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 rounded-lg cursor-default font-medium text-sm transition-colors">
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="flex flex-col p-8 border border-stone-300 dark:border-stone-700 rounded-2xl bg-stone-50 dark:bg-stone-800/30 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[11px] font-medium tracking-wider uppercase rounded-full">
              Popular
            </div>
            <h2 className="text-lg font-serif font-medium text-foreground mb-2">
              Pro
            </h2>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-3xl font-serif text-foreground">$9</span>
              <span className="text-stone-500 dark:text-stone-400 text-sm">/month</span>
            </div>
            
            <ul className="flex flex-col gap-4 mb-8 flex-1">
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Advanced AI models (Claude 3.5 Sonnet)
              </li>
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited commits
              </li>
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Priority support
              </li>
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Cloud AI orchestration
              </li>
            </ul>
            
            <button className="w-full px-4 py-2.5 bg-foreground text-background hover:opacity-90 transition-opacity rounded-lg font-medium text-sm shadow-sm">
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="flex flex-col p-8 border border-stone-200 dark:border-stone-800 rounded-2xl bg-transparent transition-colors hover:bg-stone-50/50 dark:hover:bg-stone-800/10">
            <h2 className="text-lg font-serif font-medium text-foreground mb-2">
              Team
            </h2>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-3xl font-serif text-foreground">Custom</span>
            </div>
            
            <ul className="flex flex-col gap-4 mb-8 flex-1">
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Everything in Pro
              </li>
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Custom AI models &amp; fine-tuning
              </li>
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Team repository collaboration
              </li>
              <li className="flex items-start text-[14px] text-stone-600 dark:text-stone-300 font-light">
                <svg className="w-5 h-5 mr-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Dedicated support channel
              </li>
            </ul>
            
            <button className="w-full px-4 py-2.5 border border-stone-200 dark:border-stone-800 text-foreground hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors rounded-lg font-medium text-sm shadow-sm">
              Contact Sales
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
