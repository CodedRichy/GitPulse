'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useSession } from "@/lib/session";

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  resolved_at?: string;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function SupportPage() {
  const { isAuthenticated, user } = useSession();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // Fetch ticket history for authenticated users
  const { data: ticketsData } = useSWR<{ tickets: SupportTicket[] }>(
    isAuthenticated ? '/api/support' : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to submit');

      setMessage({ text: 'Support ticket submitted successfully. We will respond within 12 hours.', type: 'success' });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setMessage({ text: 'Failed to submit ticket. Please try again or contact us directly.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />
      
      <main className="pt-64 pb-24 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-24">
           <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-6">Customer_Success</h2>
           <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-8 uppercase">Support <br />Network.</h1>
           <p className="text-xl text-stone-500 font-light max-w-2xl mx-auto leading-relaxed">
             Need assistance with your guardrails? Establish a connection with our technical team.
           </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-24">
           <SupportCard 
             title="Documentation" 
             desc="Browse the full technical manual and command reference." 
             link="/docs" 
             linkText="Open Manual"
           />
           <SupportCard 
             title="Issue Tracker" 
             desc="Found a bug in the gate engine? Report it on GitHub." 
             link="https://github.com/GitPulse/issues" 
             linkText="Report Fault"
           />
        </div>

        {isAuthenticated && ticketsData?.tickets && ticketsData.tickets.length > 0 && (
          <div className="glass-panel p-8 rounded-3xl border-stone-800 mb-12">
            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-6 border-b border-stone-900 pb-4">Your Ticket History</h3>
            <div className="space-y-3">
              {ticketsData.tickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between bg-stone-900/30 border border-stone-800/50 rounded-xl px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{ticket.subject || 'General Inquiry'}</span>
                    <span className="text-[10px] text-stone-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                    ticket.status === 'open' ? 'bg-yellow-500/10 text-yellow-500' :
                    ticket.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                    ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' :
                    'bg-stone-500/10 text-stone-500'
                  }`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-panel p-12 rounded-3xl border-stone-800 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 text-emerald-900/20 text-8xl font-bold font-mono select-none">??</div>
           <h3 className="text-2xl font-bold mb-6 tracking-tight uppercase">Direct Inquiry</h3>
           <p className="text-stone-400 font-light mb-12 max-w-lg leading-relaxed">
             For enterprise SLAs, account recovery, or specific architectural questions, we respond within 12 standard terminal hours.
           </p>

           {message && (
             <div className={`mb-8 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
               <p className={`text-[10px] font-mono text-center uppercase tracking-widest ${message.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{message.text}</p>
             </div>
           )}
           
           <form onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-8">
                 <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-600 ml-1">Identity</label>
                    <input 
                      type="text" 
                      placeholder="Your Name" 
                      value={formData.name || (isAuthenticated ? user?.name || '' : '')}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all placeholder:text-stone-700"
                      required
                    />
                 </div>
                 <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-600 ml-1">Endpoint</label>
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      value={formData.email || (isAuthenticated ? user?.email || '' : '')}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all placeholder:text-stone-700"
                      required
                    />
                 </div>
              </div>

              <div className="mt-6 space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-stone-600 ml-1">Subject</label>
                 <input 
                   type="text" 
                   placeholder="Brief summary of your inquiry..." 
                   value={formData.subject}
                   onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                   className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all placeholder:text-stone-700"
                   required
                 />
              </div>

              <div className="mt-6 space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-stone-600 ml-1">Context</label>
                 <textarea 
                  rows={4}
                  placeholder="Describe your technical challenge..." 
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all placeholder:text-stone-700 resize-none"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="mt-12 w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-400 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 {loading ? 'Transmitting...' : 'Transmit Ticket'}
              </button>
           </form>
        </div>

        <div className="mt-24 pt-12 border-t border-stone-900 text-center flex items-center justify-center gap-12 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">
           <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              Pulse Status: Operational
           </div>
           <div>Uptime: 99.99%</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SupportCard({ title, desc, link, linkText }: { title: string, desc: string, link: string, linkText: string }) {
  return (
    <div className="glass-panel p-10 rounded-3xl border-stone-800 group hover:border-emerald-500/30 transition-all">
       <h4 className="text-xl font-bold mb-4 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{title}</h4>
       <p className="text-stone-500 text-sm font-light leading-relaxed mb-10">{desc}</p>
       <a 
         href={link} 
         className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-6 py-2 border border-stone-800 rounded-full text-stone-400 group-hover:text-white group-hover:border-white transition-all"
       >
         {linkText}
       </a>
    </div>
  );
}
