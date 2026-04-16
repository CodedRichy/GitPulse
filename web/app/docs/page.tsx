'use client';

import { useState } from 'react';
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'quick-start', title: 'Quick Start' },
  { id: 'dashboard', title: 'Web Dashboard' },
  { id: 'quality-gates', title: 'Quality Gates' },
  { id: 'custom-gates', title: 'Custom Gates' },
  { id: 'configuration', title: 'Configuration' },
  { id: 'mcp', title: 'MCP Integration' },
  { id: 'commands', title: 'Command Reference' },
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 120,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 pt-64 pb-24 flex flex-col lg:flex-row gap-16">
        {/* SIDEBAR */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="sticky top-40 space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500 mb-8 px-4">Documentation</h2>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg ${
                  activeTab === s.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </aside>

        {/* CONTENT */}
        <main className="flex-1 max-w-3xl space-y-32">
          {/* OVERVIEW */}
          <section id="overview" className="scroll-mt-32">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              01_Overview
            </h2>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-10 uppercase">
              The AI <br /> Guardrail.
            </h1>
            <p className="text-xl text-stone-400 font-light leading-relaxed mb-8">
              GitPulse is an intelligent security and convention layer that sits between your AI coding tools and your git history. It ensures that every commit is safe, consistent, and documented.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
               <FeatureBrief title="Quality Gates" desc="Block secrets and smells automatically." />
               <FeatureBrief title="MCP Native" desc="Context for Windsurf & Claude." />
               <FeatureBrief title="Auto-Learning" desc="Adapts to your team's style." />
               <FeatureBrief title="Docs Engine" desc="Architecture diagrams from PRs." />
            </div>
          </section>

          {/* QUICK START */}
          <section id="quick-start" className="scroll-mt-32">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">02_Deployment</h2>
            <h3 className="text-4xl font-bold tracking-tight mb-8">Initialise Protocol</h3>
            <div className="space-y-8">
               <Step number="01" title="Installation" cmd="npm install -g gitpulse" />
               <Step number="02" title="Initialisation" cmd="pulse init" />
               <p className="text-stone-500 text-sm font-light mt-6 italic">
                 This command automatically installs the <code className="text-emerald-400">pre-commit</code> and <code className="text-emerald-400">commit-msg</code> hooks.
               </p>
               <Step number="03" title="First Commit" cmd="pulse commit" />
            </div>
          </section>

          {/* DASHBOARD */}
          <section id="dashboard" className="scroll-mt-32">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">03_Dashboard</h2>
            <h3 className="text-4xl font-bold tracking-tight mb-8">Web Dashboard</h3>
            <p className="text-stone-400 font-light mb-8">
               Access the GitPulse web dashboard for visual analytics, team management, and configuration.
            </p>
            <div className="space-y-6">
               <Step number="01" title="Launch Dashboard" cmd="pulse dashboard" />
               <p className="text-stone-500 text-sm font-light mt-4 italic">
                 This command starts a local telemetry server and opens the web dashboard in your browser. Pro and Team tiers get cloud sync and advanced analytics.
               </p>
            </div>
            <div className="mt-12 p-8 glass-panel rounded-3xl border-stone-800">
               <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-6">Dashboard Features</h4>
               <ul className="space-y-4 text-stone-400 text-sm">
                  <li className="flex gap-4 items-start">
                     <span className="text-emerald-400 mt-1">✦</span>
                     <span>Real-time quality metrics and health scores</span>
                  </li>
                  <li className="flex gap-4 items-start">
                     <span className="text-emerald-400 mt-1">✦</span>
                     <span>Quality gate configuration (Pro/Team)</span>
                  </li>
                  <li className="flex gap-4 items-start">
                     <span className="text-emerald-400 mt-1">✦</span>
                     <span>Team analytics and member management (Team)</span>
                  </li>
                  <li className="flex gap-4 items-start">
                     <span className="text-emerald-400 mt-1">✦</span>
                     <span>Custom gate creation and management</span>
                  </li>
               </ul>
            </div>
          </section>

          {/* QUALITY GATES */}
          <section id="quality-gates" className="scroll-mt-32">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">04_Security</h2>
            <h3 className="text-4xl font-bold tracking-tight mb-12">Quality Gates</h3>
            <div className="glass-panel rounded-3xl overflow-hidden border-stone-800">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-stone-900/50 border-b border-stone-800">
                        <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-stone-500">Gate</th>
                        <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-stone-500">Protection</th>
                        <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-stone-500 text-right">Severity</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900">
                     <GateRow name="Security Scan" desc="Hardcoded Secrets, SQLi, XSS" level="CRITICAL" />
                     <GateRow name="Code Smells" desc="Long Functions, TODOs, debugger" level="HIGH" />
                     <GateRow name="Test Coverage" desc="Missing tests for changed files" level="MEDIUM" />
                     <GateRow name="Documentation" desc="Missing JSDocs on core logic" level="LOW" />
                  </tbody>
               </table>
            </div>
          </section>

          {/* CUSTOM GATES */}
          <section id="custom-gates" className="scroll-mt-32">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">05_Custom_Gates</h2>
            <h3 className="text-4xl font-bold tracking-tight mb-8">Custom Quality Gates</h3>
            <p className="text-stone-400 font-light mb-8">
               Create custom quality gates tailored to your project's specific requirements (Pro/Team tier).
            </p>
            <div className="glass-panel p-8 rounded-3xl font-mono text-[13px] text-stone-300 leading-relaxed overflow-x-auto border-stone-800">
               <pre>{`{
  "name": "no-console-logs",
  "description": "Block console.log statements in production code",
  "severity": "medium",
  "pattern": "console\\.(log|warn|error|debug)",
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts"]
}`}</pre>
            </div>
            <div className="mt-8 space-y-4">
               <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500">Gate Configuration</h4>
               <ul className="space-y-3 text-stone-400 text-sm">
                  <li className="flex gap-4 items-start">
                     <span className="text-emerald-400 mt-1">✦</span>
                     <span><code className="text-emerald-400">name</code>: Unique identifier for the gate</span>
                  </li>
                  <li className="flex gap-4 items-start">
                     <span className="text-emerald-400 mt-1">✦</span>
                     <span><code className="text-emerald-400">pattern</code>: Regex pattern to match against code</span>
                  </li>
                  <li className="flex gap-4 items-start">
                     <span className="text-emerald-400 mt-1">✦</span>
                     <span><code className="text-emerald-400">include</code>: Glob patterns for files to check</span>
                  </li>
                  <li className="flex gap-4 items-start">
                     <span className="text-emerald-400 mt-1">✦</span>
                     <span><code className="text-emerald-400">exclude</code>: Glob patterns to exclude from checks</span>
                  </li>
               </ul>
            </div>
          </section>

          {/* CONFIGURATION */}
          <section id="configuration" className="scroll-mt-32">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">06_Calibration</h2>
            <h3 className="text-4xl font-bold tracking-tight mb-8">Configuration</h3>
            <p className="text-stone-400 font-light mb-8">
               Tweak your guardrails in <code className="text-emerald-400 bg-stone-900 px-1.5 py-0.5 rounded">.gitpulse/config.json</code>.
            </p>
            <div className="glass-panel p-8 rounded-3xl font-mono text-[13px] text-stone-300 leading-relaxed overflow-x-auto border-stone-800">
               <pre>{`{
  "version": 1,
  "quality_gates": {
    "security-scan": { "enabled": true, "severity": "critical" },
    "code-smells": { "enabled": true, "severity": "high" }
  },
  "conventions": {
    "commit_style": "conventional",
    "auto_learn": true
  }
}`}</pre>
            </div>
          </section>

          {/* MCP */}
          <section id="mcp" className="scroll-mt-32">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">07_Integrations</h2>
            <h3 className="text-4xl font-bold tracking-tight mb-8 italic">MCP_Protocol</h3>
            <p className="text-stone-400 font-light mb-12">
               Bridge GitPulse intelligence directly to your AI agent. Add this to your Windsurf or Claude Desktop config:
            </p>
            <div className="glass-panel p-8 rounded-3xl font-mono text-[13px] text-emerald-400/80 border-stone-800">
               <pre>{`"mcpServers": {
  "gitpulse": {
    "command": "npx",
    "args": ["-y", "pulse", "mcp", "start"]
  }
}`}</pre>
            </div>
          </section>

          {/* COMMAND REFERENCE */}
          <section id="commands" className="scroll-mt-32">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">08_Reference</h2>
            <h3 className="text-4xl font-bold tracking-tight mb-12 uppercase">Terminal_ISA</h3>
            <div className="space-y-4">
               <CommandItem cmd="pulse init" desc="Initialize GitPulse in your repository" />
               <CommandItem cmd="pulse commit" desc="AI-powered commit with quality gates" />
               <CommandItem cmd="pulse status" desc="Repository health and status summary" />
               <CommandItem cmd="pulse pr" desc="Generate PR documentation" />
               <CommandItem cmd="pulse review" desc="AI-assisted code review" />
               <CommandItem cmd="pulse dashboard" desc="Launch web dashboard (Pro/Team)" />
               <CommandItem cmd="pulse config" desc="View or update configuration" />
               <CommandItem cmd="pulse mcp start" desc="Start MCP server for AI integration" />
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}

function FeatureBrief({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl border border-stone-900 bg-zinc-950/50">
       <h4 className="font-bold text-sm mb-2">{title}</h4>
       <p className="text-stone-500 text-xs font-light tracking-tight">{desc}</p>
    </div>
  );
}

function Step({ number, title, cmd }: { number: string, title: string, cmd: string }) {
  return (
    <div className="flex gap-8 group">
       <span className="text-emerald-900 group-hover:text-emerald-400 font-mono text-xl font-bold transition-colors">{number}</span>
       <div className="flex-1">
          <h4 className="text-lg font-bold mb-4">{title}</h4>
          <div className="glass-panel p-6 rounded-xl font-mono text-sm text-stone-200 border-stone-800 flex justify-between items-center group-hover:border-emerald-500/30 transition-all">
             <code>$ {cmd}</code>
             <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
          </div>
       </div>
    </div>
  );
}

function GateRow({ name, desc, level }: { name: string, desc: string, level: string }) {
  const isCritical = level === 'CRITICAL';
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
       <td className="p-6 font-bold text-sm">{name}</td>
       <td className="p-6 text-xs text-stone-500 font-light">{desc}</td>
       <td className="p-6 text-right">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            isCritical ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'bg-stone-800 text-stone-400 border-stone-700'
          }`}>
             {level}
          </span>
       </td>
    </tr>
  );
}

function CommandItem({ cmd, desc }: { cmd: string, desc: string }) {
  return (
    <div className="flex justify-between items-center p-6 border-b border-stone-900 group">
       <code className="text-emerald-400 font-bold text-[13px] group-hover:translate-x-1 transition-transform">{cmd}</code>
       <span className="text-stone-500 text-xs font-light lowercase px-4 text-right">{desc}</span>
    </div>
  );
}
