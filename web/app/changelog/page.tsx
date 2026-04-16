'use client';

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const LOGS = [
  {
    date: "15 APR 2026",
    version: "V3.2.0",
    title: "Project Obsidian",
    description: "Launch of the new GitPulse visual identity and high-performance telemetry suite.",
    items: [
      "Electric Obsidian Identity: A new high-contrast, dark-first visual language.",
      "Safety Pulse Engine: Real-time visual feedback for quality gate scanning.",
      "JetBrains Mono Integration: Enhanced technical readability across all interfaces.",
      "Global Telemetry Logic: Improved data aggregation across distributed team repositories."
    ]
  },
  {
    date: "28 MAR 2026",
    version: "V3.1.5",
    title: "Neuro-Convention Learner",
    description: "Upgraded neural networks for pattern recognition in unconventional codebases.",
    items: [
      "Dynamic Context Mapping: Better understanding of microservice boundaries.",
      "Zero-Config Enforcement: Automatically enforce detected patterns without manual rules.",
      "Ghost Commits Detection: AI now identifies and flags 'empty' or low-value commit messages."
    ]
  },
  {
    date: "12 MAR 2026",
    version: "V3.1.0",
    title: "Model Context Protocol",
    description: "Full native support for MCP, bridging the gap between your local codebase and the global AI network.",
    items: [
      "Native MCP Server: Expose your repo intelligence safely to any AI agent.",
      "Obsidian Terminal: Launching the new React-based CLI interface.",
      "Auth Isolation: Isolated identity management for secure AI access."
    ]
  }
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy overflow-x-hidden">
      <Navbar />
      
      <main className="pt-64 pb-24 px-6 max-w-5xl mx-auto">
        <div className="mb-40 animate-in fade-in slide-in-from-top-4 duration-1000 text-center md:text-left">
           <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">System_Logs</h2>
           <h1 className="text-6xl md:text-[100px] font-bold tracking-tighter leading-[0.85] mb-12 uppercase">
            Product <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-500 italic">Iterations.</span>
          </h1>
          <p className="text-xl text-stone-500 font-light leading-relaxed max-w-2xl lowercase">
            The chronological progression of GitPulse intelligence and technical stability.
          </p>
        </div>

        <div className="space-y-48">
          {LOGS.map((log, i) => (
            <section key={i} className="relative group">
              {/* Timeline Connector */}
              <div className="hidden md:block absolute -left-16 top-0 bottom-0 w-px bg-stone-900 group-last:bg-transparent">
                 <div className="absolute top-2 -left-[5px] w-[11px] h-[11px] rounded-full border-2 border-emerald-500 bg-black group-hover:scale-125 transition-transform" />
              </div>

              <div className="grid md:grid-cols-12 gap-12 sm:gap-16">
                 {/* Metadata Column */}
                 <div className="md:col-span-3">
                    <div className="sticky top-40 space-y-4">
                       <span className="inline-block px-3 py-1 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-md text-[11px] font-mono font-bold tracking-widest">
                         {log.version}
                       </span>
                       <div className="text-[10px] font-mono text-stone-600 uppercase tracking-[0.3em] font-bold">
                         {log.date}
                       </div>
                    </div>
                 </div>

                 {/* Content Column */}
                 <div className="md:col-span-9">
                    <h2 className="text-4xl font-bold mb-8 uppercase tracking-tighter group-hover:text-emerald-400 transition-colors">{log.title}</h2>
                    <p className="text-xl text-stone-400 font-light leading-relaxed mb-12">
                      {log.description}
                    </p>
                    <ul className="space-y-6 mb-16">
                      {log.items.map((item, j) => (
                        <li key={j} className="flex gap-6 text-[15px] font-light leading-relaxed text-stone-500 items-start">
                          <span className="text-emerald-600 mt-1">✦</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Visual Asset Shadow Frame */}
                    <div className="aspect-video glass-panel rounded-3xl flex items-center justify-center font-mono text-[10px] font-bold tracking-[0.4em] text-stone-700 uppercase border-stone-900 overflow-hidden relative">
                       <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
                       Asset_Preview::{log.version}
                    </div>
                 </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-64 pt-32 border-t border-stone-900 text-center">
          <p className="text-stone-600 font-bold uppercase tracking-[0.3em] text-[10px] mb-12">Deployment_Status: Operational</p>
          <a href="https://github.com/GitPulse" className="px-12 py-5 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 hover:text-white transition-all shadow-2xl shadow-emerald-500/10">
            Follow on GitHub
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
