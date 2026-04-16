'use client';

import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />
      
      <main className="pt-64 pb-24 px-6 max-w-4xl mx-auto text-center">
        <div className="mb-12">
          <span className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6 block">Error_Code: 404</span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 uppercase">Signal <br />Lost.</h1>
          <p className="text-xl text-stone-500 font-light max-w-xl mx-auto leading-relaxed">
            The requested resource is not found in our telemetry logs. The page may have been moved or never existed.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <Link 
            href="/" 
            className="px-10 py-5 rounded-full bg-white text-black hover:bg-emerald-400 hover:text-white transition-all duration-300 font-bold uppercase tracking-widest text-sm shadow-2xl shadow-white/5 active:scale-95"
          >
            Return to Base
          </Link>
          <Link 
            href="/docs" 
            className="px-10 py-5 rounded-full glass-panel text-white hover:bg-stone-800 transition-all font-bold uppercase tracking-widest text-sm"
          >
            Documentation
          </Link>
        </div>

        <div className="mt-24 p-8 glass-panel rounded-3xl border-stone-800 max-w-lg mx-auto">
          <p className="text-[10px] font-mono text-stone-600 uppercase tracking-widest mb-4">Diagnostic Output</p>
          <code className="block text-left text-xs font-mono text-stone-500 bg-stone-900/50 p-4 rounded-lg overflow-x-auto">
            <span className="text-emerald-500">$</span> pulse status<br/>
            <span className="text-stone-600">✗</span> Page not found: 404<br/>
            <span className="text-stone-600">→</span> Check your URL or return to dashboard<br/>
            <span className="text-emerald-500">$</span> _
          </code>
        </div>
      </main>

      <Footer />
    </div>
  );
}
