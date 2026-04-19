'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { useSession } from '@/lib/session';
import useSWR from 'swr';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at?: string;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  
  // Fetch API keys with SWR
  const { data: keysData, error: keysError, mutate: mutateKeys } = useSWR<{ keys: ApiKey[] }>('/api/keys', fetcher);

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, sessionLoading, router]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleLogout = async () => {
    await fetch('/api/session', { method: 'DELETE', credentials: 'include' });
    router.push('/');
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveMessage(null);
    try {
      if (!user?.id) {
        throw new Error('No user found');
      }

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      setSaveMessage({ text: 'Settings updated successfully', type: 'success' });
    } catch (err) {
      setSaveMessage({ text: err instanceof Error ? err.message : 'Failed to save settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 pt-64 pb-24">
        <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-stone-600 mb-6 px-1">System_Config</h2>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase">User_Settings</h1>
           </div>
           <button 
             onClick={handleLogout}
             className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-red-500 transition-colors pb-1 border-b border-stone-900 hover:border-red-500"
           >
             Sign_Out_Protocol
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
           {/* SIDEBAR NAV */}
           <div className="lg:col-span-3 space-y-4">
              <Link href="/profile" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-stone-600 hover:text-stone-300 transition-colors">Profile</Link>
              <Link href="/settings" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">Settings</Link>
              <Link href="/subscription" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-stone-600 hover:text-stone-300 transition-colors">Subscription</Link>
              <Link href="/settings/delete" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-stone-600 hover:text-red-400 transition-colors">Delete Account</Link>
           </div>

           {/* MAIN SETTINGS FORM */}
           <div className="lg:col-span-9 space-y-12">
              <section className="glass-panel p-10 rounded-3xl border-stone-800">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-10 border-b border-stone-900 pb-6">General_Identity</h3>
                 <div className="space-y-8">
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-stone-600 ml-1">Email_Address</label>
                       <input 
                         type="email" 
                         value={email} 
                         onChange={(e) => setEmail(e.target.value)}
                         className="bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 text-sm font-mono text-stone-300 outline-none focus:border-emerald-500 transition-all"
                       />
                       <span className="text-[9px] text-stone-700 uppercase tracking-widest ml-1">Required for billing and notifications</span>
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-stone-600 ml-1">Git_Login</label>
                       <input 
                         type="text" 
                         value={user?.name || user?.github_login || 'N/A'} 
                         disabled
                         className="bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 text-sm font-mono text-stone-500 cursor-not-allowed"
                       />
                    </div>
                 </div>
              </section>

              <section className="glass-panel p-10 rounded-3xl border-stone-800 relative overflow-hidden">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-10 border-b border-stone-900 pb-6">API_Telemetrics</h3>
                 <div className="space-y-8">
                    {newlyCreatedKey && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">New Key Created - Copy Now!</p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={newlyCreatedKey}
                            readOnly
                            className="flex-1 bg-stone-900/50 border border-emerald-500/30 rounded-xl px-4 py-2 text-sm font-mono text-emerald-400"
                            onClick={(e) => {
                              (e.target as HTMLInputElement).select();
                              navigator.clipboard.writeText(newlyCreatedKey);
                            }}
                          />
                          <button 
                            onClick={() => setNewlyCreatedKey(null)}
                            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold uppercase"
                          >
                            Done
                          </button>
                        </div>
                        <p className="text-[9px] text-stone-600 mt-2">This key will not be shown again. Store it securely.</p>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-stone-600 ml-1">Your API Keys</label>
                       
                       {keysData?.keys && keysData.keys.length > 0 ? (
                         <div className="space-y-2">
                           {keysData.keys.map((key) => (
                             <div key={key.id} className="flex items-center justify-between bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3">
                               <div className="flex flex-col">
                                 <span className="text-sm font-mono text-emerald-500/80">{key.key_prefix}...</span>
                                 <span className="text-[10px] text-stone-500">{key.name} • Created {new Date(key.created_at).toLocaleDateString()}</span>
                                 {key.last_used_at && (
                                   <span className="text-[9px] text-stone-600">Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                                 )}
                               </div>
                               <button
                                 onClick={async () => {
                                   if (!confirm('Revoke this API key? This action cannot be undone.')) return;
                                   const csrfToken = document.cookie
                                     .split('; ')
                                     .find(row => row.startsWith('csrf_token='))
                                     ?.split('=')[1];
                                   await fetch(`/api/keys?id=${key.id}`, {
                                     method: 'DELETE',
                                     headers: { 'X-CSRF-Token': csrfToken || '' },
                                     credentials: 'include',
                                   });
                                   mutateKeys();
                                 }}
                                 className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                               >
                                 Revoke
                               </button>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-sm text-stone-500">No API keys created yet.</p>
                       )}
                       
                       <div className="flex gap-4 mt-4">
                          <input 
                            type="text" 
                            placeholder="Key name (e.g., 'CLI Laptop')"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            className="flex-1 bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-all"
                          />
                          <button
                            onClick={async () => {
                              const name = newKeyName.trim() || 'API Key';
                              const csrfToken = document.cookie
                                .split('; ')
                                .find(row => row.startsWith('csrf_token='))
                                ?.split('=')[1];
                              const res = await fetch('/api/keys', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-CSRF-Token': csrfToken || '',
                                },
                                credentials: 'include',
                                body: JSON.stringify({ name }),
                              });
                              const data = await res.json();
                              if (data.key?.full_key) {
                                setNewlyCreatedKey(data.key.full_key);
                                setNewKeyName('');
                                mutateKeys();
                              }
                            }}
                            disabled={loading}
                            className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50"
                          >
                            Generate Key
                          </button>
                       </div>
                       <p className="text-[10px] text-stone-500 font-light leading-relaxed mt-2">
                          Use these keys to synchronise your local <code className="text-emerald-400">gitpulse</code> CLI with the cloud dashboard.
                       </p>
                    </div>
                 </div>
              </section>

              <section className="glass-panel p-10 rounded-3xl border-stone-800">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-10 border-b border-stone-900 pb-6">Preferences</h3>
                 <div className="space-y-10">
                    <PreferenceToggle title="System_Intelligence" desc="Allow AI to periodically suggest architectural patterns based on telemetry." active={true} />
                    <PreferenceToggle title="Live_Pulse_Glow" desc="Enable the visual pulse animations across the dashboard interface." active={true} />
                    <PreferenceToggle title="Identity_SSO" desc="Enforce mandatory GitHub login for all team-linked repositories." active={false} />
                 </div>
              </section>

              {saveMessage && (
                 <div className={`p-4 rounded-xl text-center text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 ${
                   saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                 }`}>
                   {saveMessage.text}
                 </div>
              )}

              <div className="flex justify-end pt-8">
                 <button 
                   onClick={handleSave}
                   disabled={loading}
                   className="px-12 py-5 bg-white text-black rounded-full text-xs font-bold uppercase tracking-[0.2em] hover:bg-emerald-400 hover:text-white transition-all shadow-2xl shadow-white/5 active:scale-95"
                 >
                   {loading ? 'Executing_Update' : 'Execute_Save'}
                 </button>
              </div>
           </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PreferenceToggle({ title, desc, active }: { title: string, desc: string, active: boolean }) {
  const [isOn, setIsOn] = useState(active);
  return (
    <div className="flex items-start justify-between gap-8 group">
       <div className="flex-1">
          <h4 className="font-bold text-sm mb-2 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{title}</h4>
          <p className="text-stone-500 text-xs font-light leading-relaxed">{desc}</p>
       </div>
       <button 
         onClick={() => setIsOn(!isOn)}
         className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isOn ? 'bg-emerald-500 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-stone-800'}`}
       >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isOn ? 'left-7' : 'left-1'}`} />
       </button>
    </div>
  );
}
