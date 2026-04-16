'use client';

import { useState } from 'react';
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";

export default function SubscriptionPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState('');

  const handleUpgrade = (tier: string) => {
    setSelectedTier(tier);
    setModalOpen(true);
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

        <div className="grid md:grid-cols-3 gap-8 mb-40">
           <PlanCard 
             tier="Hobbyist"
             price="0"
             current={true}
             features={[
               "Standard Quality Gates",
               "Local Telemetry Only",
               "Manual CI Integration",
               "Community Support"
             ]}
             onUpgrade={() => {}}
           />
           <PlanCard 
             tier="Professional"
             price="19"
             highlighted={true}
             features={[
               "Unlimited Sync Capacity",
               "Custom Quality Gates",
               "Priority Support",
               "Native MCP Access",
               "Context-Aware Intelligence"
             ]}
             onUpgrade={() => handleUpgrade('Professional')}
           />
           <PlanCard 
             tier="Business"
             price="49"
             features={[
               "Team Registry Management",
               "Network-Wide Analytics",
               "SSO Identity Isolation",
               "Dedicated Core Support",
               "Custom LLM Integration"
             ]}
             onUpgrade={() => handleUpgrade('Business')}
           />
        </div>

        {/* Coming Soon Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <div className="glass-panel p-8 rounded-3xl border-stone-800 max-w-md w-full">
              <h3 className="text-xl font-bold uppercase tracking-tight mb-4">Tier Upgrade</h3>
              <p className="text-stone-400 font-light mb-6">
                {selectedTier} tier is coming soon. Join the waitlist to get early access when we launch paid plans.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-stone-900 text-stone-400 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition-all"
                >
                  Close
                </button>
                <Link 
                  href="/support"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-emerald-500 text-[#09090B] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white transition-all text-center"
                >
                  Join Waitlist
                </Link>
              </div>
            </div>
          </div>
        )}

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

function PlanCard({ tier, price, features, highlighted, current, onUpgrade }: { 
  tier: string, 
  price: string, 
  features: string[], 
  highlighted?: boolean,
  current?: boolean,
  onUpgrade: () => void
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
            <span className="text-4xl font-bold tracking-tighter">${price}</span>
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
        disabled={current}
        className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${
          current ? 'bg-stone-900 text-stone-600 cursor-not-allowed' :
          highlighted ? 'bg-emerald-500 text-[#09090B] hover:bg-white shadow-xl shadow-emerald-500/20' : 
          'bg-white text-black hover:bg-emerald-400 hover:text-white'
        }`}>
        {current ? 'Active_Tuned' : highlighted ? 'Upgrade_Terminal' : 'Initialise_Tier'}
      </button>
    </div>
  );
}
