'use client';

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />
      
      <main className="pt-64 pb-24 px-6 max-w-3xl mx-auto">
        <div className="mb-24">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">Service_Agreement</h2>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 uppercase">Terms Of <br />Service.</h1>
          <p className="text-stone-500 font-mono text-xs uppercase tracking-widest">Effective Date: April 15, 2026</p>
        </div>

        <div className="space-y-16 text-stone-400 font-light leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">01. Service Description</h2>
            <p>
              GitPulse provides an automated guardrail system for git-based software development. This includes AI-assisted commit suggestions, code quality gating, and architectural documentation generation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">02. User Responsibilities</h2>
            <p>
              By using GitPulse, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-sm tracking-wide">
              <li>Deploy the system reasonably within your organization's security guidelines.</li>
              <li>Maintain the secrecy of your API keys and GitHub OAuth tokens.</li>
              <li>Acknowledge that AI-generated output (commit messages/docs) should be reviewed for accuracy before production deployment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">03. Subscription Tiers</h2>
            <div className="space-y-4">
              <p>
                Service limits are enforced based on your subscription bandwidth:
              </p>
              <ul className="space-y-3">
                <li><span className="text-emerald-400 font-mono font-bold mr-2 text-xs">FREE</span> &mdash; Individual use, local telemetry only.</li>
                <li><span className="text-emerald-400 font-mono font-bold mr-2 text-xs">PRO</span> &mdash; Single user, priority support, full cloud sync.</li>
                <li><span className="text-emerald-400 font-mono font-bold mr-2 text-xs">TEAM</span> &mdash; Multiple seats, network-level analytics, custom SLA.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">04. Limitation of Liability</h2>
            <p className="border-l-2 border-stone-800 pl-6 italic">
              GitPulse is provided "AS IS". While our guardrails are designed to prevent errors, we are not liable for commit history data loss, missed security vulnerabilities, or production downtime caused by automated documentation scripts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">05. Termination</h2>
            <p>
              You may terminate your service at any time. Upon termination, your cloud-synced metadata will be purged after 30 days unless a request for immediate deletion is made.
            </p>
          </section>

          <section className="pt-12 border-t border-stone-900">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Agreement Notice</h2>
            <p className="text-xs">
              By initialising <code className="bg-stone-900 text-emerald-400 px-1 rounded mx-1 font-mono">pulse init</code>, you confirm your acceptance of these terms.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
