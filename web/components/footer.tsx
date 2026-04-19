'use client';

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#09090B] border-t border-stone-900 pt-32 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-16 mb-32">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="font-bold text-xl tracking-tighter mb-8 block group">
              Git<span className="text-emerald-400 group-hover:text-white transition-colors">Pulse</span>
            </Link>
            <p className="text-stone-500 text-sm font-light leading-relaxed mb-10 max-w-xs">
              The intelligent guardrail for code. Secure your repository, enforce team conventions, and generate perfect documentation with state-of-the-art AI.
            </p>
            <div className="flex gap-4">
               <SocialIcon label="G" href="https://github.com/GitPulse" />
               <SocialIcon label="T" href="#" />
               <SocialIcon label="D" href="#" />
            </div>
          </div>

          {/* Nav Columns */}
          <FooterColumn title="Product">
            <FooterLink href="/docs">Documentation</FooterLink>
            <FooterLink href="/subscription">Pricing</FooterLink>
            <FooterLink href="/changelog">Changelog</FooterLink>
            <FooterLink href="/docs#mcp">MCP Server</FooterLink>
          </FooterColumn>

          <FooterColumn title="Solutions">
            <FooterLink href="/docs#quality-gates">Enterprise</FooterLink>
            <FooterLink href="/docs#security">Security Scan</FooterLink>
            <FooterLink href="/docs#conventions">Conventions</FooterLink>
          </FooterColumn>

          <FooterColumn title="Legal">
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/terms">Terms of Service</FooterLink>
            <FooterLink href="/support">Support</FooterLink>
          </FooterColumn>

          <FooterColumn title="Status">
             <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                All Systems Operational
             </div>
          </FooterColumn>
        </div>

        <div className="pt-12 border-t border-stone-900 flex flex-col md:flex-row justify-between items-center gap-8">
           <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-700">
             © 2026 GitPulse — Engineering Excellence through AI
           </p>
           <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-700">
              <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
              <span className="text-stone-900">Made with ❤️ in New York</span>
           </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-400">
        {title}
      </h4>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="text-stone-600 hover:text-emerald-400 transition-colors text-sm font-light tracking-tight"
    >
      {children}
    </Link>
  );
}

function SocialIcon({ label, href }: { label: string, href: string }) {
  return (
    <Link 
      href={href} 
      className="w-10 h-10 border border-stone-900 rounded-xl flex items-center justify-center text-xs text-stone-700 hover:text-emerald-400 hover:border-emerald-400/50 hover:bg-emerald-400/5 transition-all"
    >
      {label}
    </Link>
  );
}
