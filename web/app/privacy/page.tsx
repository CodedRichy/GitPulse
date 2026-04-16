'use client';

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />
      
      <main className="pt-64 pb-24 px-6 max-w-3xl mx-auto">
        <div className="mb-24">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">Legal_Protocol</h2>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 uppercase">Privacy <br />Policy.</h1>
          <p className="text-stone-500 font-mono text-xs uppercase tracking-widest">Effective Date: April 15, 2026</p>
        </div>

        <div className="space-y-16 text-stone-400 font-light leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">01. Data Collection</h2>
            <div className="space-y-4">
              <p>
                GitPulse is designed with "Local-First" principles. Your source code never leaves your local environment during regular operations.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-stone-100 font-medium">Local Telemetry</span>: Performance metrics and gate results are stored in a local `.jsonl` file.</li>
                <li><span className="text-stone-100 font-medium">Cloud Sync</span>: If you opt-in for Pro/Team tiers, only metadata (score results, pass/fail status) is synced to our secure servers.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">02. Data Storage</h2>
            <p>
              By default, all data is stored locally within your repository in the <code className="bg-stone-900 text-emerald-400 px-1.5 rounded">.gitpulse/</code> directory. For synchronized accounts, data is stored in encrypted PostgreSQL volumes with SOC2 compliance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">03. Data Usage</h2>
            <p>
              We use telemetry data solely to generate your health reports and improve the accuracy of our AI convention models. <span className="text-emerald-400 font-medium italic underline decoration-emerald-900 underline-offset-4">We do not sell your data or use your code content for training global models.</span>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">04. Third-Party Services</h2>
            <div className="space-y-4">
              <p>We integrate with the following providers to deliver our services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-stone-100 font-medium">GitHub OAuth</span>: Authentication and repository metadata access.</li>
                <li><span className="text-stone-100 font-medium">OpenRouter / OpenAI / Ollama</span>: AI inference for commit suggestions (managed by your local configuration).</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">05. Your Rights</h2>
            <p>
              You maintain full ownership of your data. You may export your local history or delete your cloud-synced account at any time via the GitPulse CLI or the settings panel.
            </p>
          </section>

          <section className="pt-12 border-t border-stone-900">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Contact Protocol</h2>
            <p className="text-xs">
              For privacy-related inquiries, establish a connection at: <span className="text-emerald-400">security@gitpulse.app</span>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
