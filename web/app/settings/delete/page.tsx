'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDelete = async () => {
    if (!confirmed) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Call delete account API
      const response = await fetch('/api/account/delete', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete account');
      
      // Clear session cookie
      await fetch('/api/session', { method: 'DELETE', credentials: 'include' });
      
      setSuccess(true);
      
      // Redirect after delay
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setError('Failed to delete account. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold tracking-tighter mb-4 uppercase">Account_Deleted</h2>
          <p className="text-stone-500 font-light mb-8">
            Your account has been permanently deleted. Redirecting to home...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] grainy">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 pt-64 pb-24">
        <div className="mb-12">
          <Link href="/settings" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-white transition-colors pb-1 border-b border-stone-900 hover:border-white">
            <span>←</span>
            <span>Back_to_Settings</span>
          </Link>
        </div>

        <div className="glass-panel p-12 rounded-3xl border-red-500/20">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 flex-shrink-0">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tighter mb-4 uppercase text-red-500">Delete_Account</h1>
              <p className="text-stone-400 font-light leading-relaxed">
                This action is permanent and irreversible. All your data will be permanently deleted from our servers.
              </p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <WarningItem 
              icon="◆"
              text="All your repositories will be removed from GitPulse"
            />
            <WarningItem 
              icon="◆"
              text="Your commit history and analytics will be permanently deleted"
            />
            <WarningItem 
              icon="◆"
              text="Custom quality gates and configurations will be lost"
            />
            <WarningItem 
              icon="◆"
              text="Active subscriptions will be cancelled immediately"
            />
            <WarningItem 
              icon="◆"
              text="This action cannot be undone"
            />
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs text-red-500 font-mono text-center uppercase tracking-widest">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <label className="flex items-start gap-4 cursor-pointer">
              <input 
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-stone-700 bg-stone-900 text-red-500 focus:ring-red-500 focus:ring-offset-0"
              />
              <span className="text-sm text-stone-400 font-light leading-relaxed">
                I understand that this action is permanent and I want to delete my GitPulse account
              </span>
            </label>

            <button
              onClick={handleDelete}
              disabled={!confirmed || loading}
              className="w-full py-4 bg-red-500 text-white rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/10"
            >
              {loading ? 'Processing_Deletion...' : 'Delete_Account_Permanently'}
            </button>

            <Link 
              href="/settings"
              className="block w-full py-4 text-center text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-white transition-colors"
            >
              Cancel_and_Return
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-mono text-stone-600 uppercase tracking-widest">
            Need help? <Link href="/support" className="text-emerald-500 hover:text-white transition-colors">Contact_Support</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function WarningItem({ icon, text }: { icon: string, text: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-red-500 mt-0.5">{icon}</span>
      <p className="text-sm text-stone-400 font-light">{text}</p>
    </div>
  );
}
