'use client';

import { useEffect } from 'react';
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />
      
      <main className="pt-64 pb-24 px-6 max-w-4xl mx-auto text-center">
        <div className="mb-12">
          <span className="text-[12px] font-bold uppercase tracking-[0.4em] text-red-500 mb-6 block">System_Failure</span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 uppercase">Critical <br />Error.</h1>
          <p className="text-xl text-stone-500 font-light max-w-xl mx-auto leading-relaxed">
            An unexpected error occurred in the telemetry system. Our engineers have been notified.
          </p>
        </div>

        {error.digest && (
          <div className="mb-8 p-4 glass-panel rounded-xl border-stone-800 max-w-md mx-auto">
            <p className="text-[10px] font-mono text-stone-600 uppercase tracking-widest mb-2">Error Reference</p>
            <code className="text-xs font-mono text-red-400">{error.digest}</code>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-6">
          <button 
            onClick={reset}
            className="px-10 py-5 rounded-full bg-white text-black hover:bg-emerald-400 hover:text-white transition-all duration-300 font-bold uppercase tracking-widest text-sm shadow-2xl shadow-white/5 active:scale-95"
          >
            Attempt Recovery
          </button>
          <Link 
            href="/" 
            className="px-10 py-5 rounded-full glass-panel text-white hover:bg-stone-800 transition-all font-bold uppercase tracking-widest text-sm"
          >
            Return to Base
          </Link>
        </div>

        <div className="mt-24 p-8 glass-panel rounded-3xl border-stone-800 max-w-lg mx-auto">
          <p className="text-[10px] font-mono text-stone-600 uppercase tracking-widest mb-4">Diagnostic Output</p>
          <code className="block text-left text-xs font-mono text-stone-500 bg-stone-900/50 p-4 rounded-lg overflow-x-auto">
            <span className="text-red-500">✗</span> {error.message || 'Unknown error occurred'}<br/>
            <span className="text-stone-600">→</span> Try refreshing the page<br/>
            <span className="text-stone-600">→</span> Contact support if the issue persists<br/>
            <span className="text-emerald-500">$</span> _
          </code>
        </div>
      </main>

      <Footer />
    </div>
  );
}
