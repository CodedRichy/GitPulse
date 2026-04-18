'use client';

import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Terminal from "@/components/terminal";
import { useSession } from "@/lib/session";

export default function Home() {
  const { isAuthenticated } = useSession();

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy overflow-x-hidden">
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-64 pb-32 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            {/* CLI Tool Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CLI Tool v0.1 — npm install -g gitpulse
            </div>
            
            <h1 className="text-5xl md:text-[100px] font-bold tracking-tighter leading-[0.85] mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              CODE QUALITY <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500">AT THE CLI.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-stone-400 font-light leading-relaxed max-w-3xl mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
              GitPulse is a CLI tool that enforces code quality before every commit. Quality gates, AI-powered commit messages, and automatic documentation — right in your terminal.
            </p>
            <p className="text-sm text-stone-500 font-light mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              Web dashboard included for analytics and team management.
            </p>

            <div className="flex flex-wrap justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="px-10 py-5 rounded-full bg-white text-black hover:bg-emerald-400 hover:text-white transition-all duration-300 font-bold uppercase tracking-widest text-sm shadow-2xl shadow-white/5 active:scale-95"
                  >
                    Go to Dashboard
                  </Link>
                  <Link 
                    href="/profile" 
                    className="px-10 py-5 rounded-full glass-panel text-white hover:bg-stone-800 transition-all font-bold uppercase tracking-widest text-sm"
                  >
                    View Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/docs#quick-start" 
                    className="px-10 py-5 rounded-full bg-white text-black hover:bg-emerald-400 hover:text-white transition-all duration-300 font-bold uppercase tracking-widest text-sm shadow-2xl shadow-white/5 active:scale-95"
                  >
                    Install CLI
                  </Link>
                  <Link 
                    href="/docs" 
                    className="px-10 py-5 rounded-full glass-panel text-white hover:bg-stone-800 transition-all font-bold uppercase tracking-widest text-sm"
                  >
                    View Documentation
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* BACKGROUND DECORATIONS */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-emerald-500/10 blur-[160px] rounded-full -z-10 animate-pulse duration-[10s]" />
          
          {/* SAFETY GRID */}
          <div
            className="absolute inset-x-0 bottom-0 h-64 opacity-20 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgba(34,211,238,0.2)_1px,transparent_0)] [background-size:40px_40px]"
          />
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 px-6 bg-zinc-950/50 border-y border-stone-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.3em] text-emerald-500 mb-4">How It Works</h2>
              <h3 className="text-4xl md:text-5xl font-bold tracking-tight">Install. Commit. Protect.</h3>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8">
              <WorkflowStep 
                number="01" 
                title="Install" 
                desc="npm install -g gitpulse"
                detail="Global CLI tool for your terminal"
              />
              <WorkflowStep 
                number="02" 
                title="Initialize" 
                desc="gitpulse init"
                detail="Installs git hooks in your repo"
              />
              <WorkflowStep 
                number="03" 
                title="Commit" 
                desc="gitpulse commit"
                detail="AI message + quality gates"
              />
              <WorkflowStep 
                number="04" 
                title="Sync" 
                desc="gitpulse dashboard"
                detail="Web analytics for your team"
              />
            </div>
          </div>
        </section>

        {/* TERMINAL SECTION */}
        <section className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
             <div className="w-full max-w-4xl relative">
                <Terminal />
                {/* Visual Label */}
                <div className="absolute -right-8 top-1/2 transform -rotate-90 origin-right text-[10px] font-mono font-bold tracking-[0.5em] text-emerald-900/40 uppercase">
                  CLI_Quality_Guardian
                </div>
             </div>
          </div>
        </section>

        {/* LATEST RELEASES */}
        <section className="py-32 px-6 border-t border-stone-900">
          <div className="max-w-7xl mx-auto">
             <div className="flex justify-between items-end mb-16">
                <div>
                   <h2 className="text-[12px] font-bold uppercase tracking-[0.3em] text-emerald-500 mb-4">Latest releases</h2>
                   <h3 className="text-4xl md:text-5xl font-bold tracking-tight">Evolving in the shadows.</h3>
                </div>
                <Link href="/changelog" className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-emerald-400 transition-colors pb-2 border-b border-stone-800 hover:border-emerald-400">View All Updates</Link>
             </div>
             
             <div className="grid md:grid-cols-3 gap-8">
                <ObsidianCard 
                  title="Smart Provider Health"
                  description="Circuit breaker pattern with automatic fallback. If Groq is down, we switch to OpenRouter instantly."
                  tag="Infrastructure"
                  date="Apr 2026"
                />
                <ObsidianCard 
                  title="Quality Gates 2.0"
                  description="Block commit secrets and critical SQLi before they reach your branch. Zero-latency analysis."
                  tag="Security"
                  date="Apr 2026"
                />
                <ObsidianCard 
                  title="One-Line Installer"
                  description="irm install for instant setup. No Node.js required. Single binary distribution."
                  tag="Distribution"
                  date="Apr 2026"
                />
             </div>
          </div>
        </section>

        {/* FEATURE SHOWCASE - CLI FIRST */}
        <section className="py-40 bg-zinc-950/50 grainy">
           <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-32 items-center">
              <div>
                 <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-10">CLI-FIRST <br /> QUALITY.</h2>
                 <p className="text-xl text-stone-400 font-light leading-relaxed mb-12">
                   GitPulse lives in your terminal. It hooks into your git workflow and runs quality checks before every commit. No browser required.
                 </p>
                 <div className="space-y-8">
                    <FeaturePoint title="Git Hooks Integration" desc="Automatically runs quality gates on every git commit." />
                    <FeaturePoint title="Smart Provider Fallback" desc="If your AI provider fails, we automatically switch to the best available." />
                    <FeaturePoint title="AI-Powered Commits" desc="Generates professional commit messages from your code changes." />
                    <FeaturePoint title="Local Analysis" desc="Everything runs on your machine — no code leaves your repo." />
                 </div>
              </div>
              <div className="relative aspect-square glass-panel rounded-3xl overflow-hidden flex items-center justify-center border-stone-800">
                 <div className="w-full h-full bg-gradient-to-br from-emerald-500/10 to-transparent" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border border-emerald-500/20 rounded-full animate-[ping_3s_infinite]" />
                    <div className="absolute w-48 h-48 border border-emerald-500/30 rounded-full animate-[ping_2s_infinite]" />
                    <div className="absolute w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.4)]">
                        <span className="text-white text-4xl font-mono">&gt;_</span>
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ObsidianCard({ title, description, tag, date }: { title: string, description: string, tag: string, date: string }) {
  return (
    <div className="glass-panel p-10 rounded-2xl group hover:border-emerald-500/50 transition-all duration-500 cursor-pointer">
      <div className="flex justify-between items-start mb-12">
         <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 py-1 px-3 bg-emerald-400/10 rounded-full border border-emerald-400/20">
           {tag}
         </span>
         <span className="text-[10px] font-mono text-stone-600 uppercase tracking-widest">{date}</span>
      </div>
      <h4 className="text-2xl font-bold mb-6 group-hover:text-emerald-400 transition-colors">{title}</h4>
      <p className="text-stone-500 font-light leading-relaxed text-[15px]">{description}</p>
    </div>
  );
}

function FeaturePoint({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex gap-6 group">
       <div className="text-emerald-500 mt-1.5 group-hover:rotate-12 transition-transform">✦</div>
       <div>
          <h4 className="font-bold text-lg mb-2">{title}</h4>
          <p className="text-stone-500 text-sm font-light leading-relaxed">{desc}</p>
       </div>
    </div>
  );
}

function WorkflowStep({ number, title, desc, detail }: { number: string, title: string, desc: string, detail: string }) {
  return (
    <div className="text-center group">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
        <span className="text-emerald-400 font-mono text-lg font-bold">{number}</span>
      </div>
      <h4 className="font-bold text-lg mb-2">{title}</h4>
      <code className="text-emerald-400 text-sm font-mono bg-stone-900 px-2 py-1 rounded">{desc}</code>
      <p className="text-stone-500 text-sm font-light mt-3">{detail}</p>
    </div>
  );
}
