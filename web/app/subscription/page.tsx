'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";

export default function SubscriptionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (tier: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/subscription');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.toLowerCase() }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to generate checkout');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Upgrade error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy uppercase-headings">
      <Navbar />
      
      <main className="pt-64 pb-24 px-6 max-w-7xl mx-auto">
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6 px-1">Active_Subscription</h2>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase">Plan_Matrix</h1>
           </div>
           <Link href="/settings" className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-white transition-colors pb-1 border-b border-stone-900 hover:border-white">
             Back_to_Identity
           </Link>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-bold uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
            Error: {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 mb-40">
           <PlanCard 
             tier="Hobbyist"
             price="0"
             current={true}
             features={[
               "Standard Quality Gates",
               "Local Audit Logbook",
               "Community Support",
               "Manual CI Integration"
             ]}
             onUpgrade={() => {}}
             loading={loading}
           />
           <PlanCard 
             tier="Pro"
             price="1,799"
             highlighted={true}
             features={[
               "Unlimited Sync Capacity",
               "Custom Quality Gates",
               "AI style learning",
               "Priority Support",
               "Context-Aware Intelligence"
             ]}
             onUpgrade={() => handleUpgrade('Pro')}
             loading={loading}
           />
           <PlanCard 
             tier="Team"
             price="9,199"
             features={[
               "Flat fee (up to 10 users)",
               "Team Registry Management",
               "Compliance Exports",
               "Organization Analytics",
               "SSO Identity Isolation (Phase 9.1)"
             ]}
             onUpgrade={() => handleUpgrade('Team')}
             loading={loading}
           />
        </div>

        {/* USAGE METRICS (Technical Dashboard Style) */}
        <div className="glass-panel p-12 rounded-3xl border-stone-800">
           <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-stone-500 mb-10 border-b border-stone-900 pb-6">Current_Bandwidth_Usage</h3>
           <div className="grid md:grid-cols-2 gap-16">
              <div>
                 <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-4">
                    <span className="text-stone-500">Telemetry_Data_Syncs</span>
                    <span>142 / 500 MB</span>
                 </div>
                 <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[24%] shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
                 </div>
              </div>
              <div>
                 <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-4">
                    <span className="text-stone-500">AI_Inference_Calls</span>
                    <span>Unlimited</span>
                 </div>
                 <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
                 </div>
              </div>
           </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PlanCard({ tier, price, features, highlighted, current, onUpgrade, loading }: { 
  tier: string, 
  price: string, 
  features: string[], 
  highlighted?: boolean,
  current?: boolean,
  onUpgrade: () => void,
  loading?: boolean
}) {
  return (
    <div className={`p-10 rounded-3xl flex flex-col h-full border transition-all duration-500 ${
      highlighted ? 'glass-panel border-emerald-500/50 shadow-[0_0_50px_rgba(6,182,212,0.1)] scale-105 z-10' : 'bg-transparent border-stone-900'
    }`}>
      <div className="flex-1">
         <div className="flex justify-between items-start mb-6">
            <h3 className={`text-xl font-bold uppercase tracking-tight ${highlighted ? 'text-emerald-400' : 'text-stone-300'}`}>{tier}</h3>
            {current && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-stone-900 text-stone-500 border border-stone-800 rounded">Current</span>}
         </div>
         <div className="flex items-baseline gap-1 mb-10">
            <span className="text-4xl font-bold tracking-tighter">₹{price}</span>
            <span className="text-stone-600 text-[10px] font-bold">/MO</span>
         </div>
         <ul className="space-y-4 mb-16">
            {features.map((f, i) => (
               <li key={i} className="flex gap-4 text-[11px] font-bold uppercase tracking-widest items-start">
                  <span className={highlighted ? 'text-emerald-500' : 'text-stone-800'}>✦</span>
                  <span className={highlighted ? 'text-stone-200' : 'text-stone-500'}>{f}</span>
               </li>
            ))}
         </ul>
      </div>
      <button 
        onClick={onUpgrade}
        disabled={current || loading}
        className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${
          current ? 'bg-stone-900 text-stone-600 cursor-not-allowed' :
          highlighted ? 'bg-emerald-500 text-[#09090B] hover:bg-white shadow-xl shadow-emerald-500/20' : 
          'bg-white text-black hover:bg-emerald-400 hover:text-white'
        } disabled:opacity-50`}>
        {loading ? 'Initializing...' : current ? 'Active_Tuned' : highlighted ? 'Upgrade_Terminal' : 'Initialise_Tier'}
      </button>
    </div>
  );
}

