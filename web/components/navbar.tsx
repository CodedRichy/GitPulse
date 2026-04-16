'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const { user, isAuthenticated } = useSession();

  if (isAuthPage) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-8 py-4 rounded-full border border-stone-800/50 shadow-2xl">
        <div className="flex items-center gap-12">
          <Link href="/" className="font-bold text-2xl tracking-tighter group flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
               <span className="text-[10px] text-white underline">P</span>
            </div>
            Git<span className="text-emerald-400 group-hover:text-white transition-colors">Pulse</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/docs">Docs</NavLink>
            <NavLink href="/subscription">Pricing</NavLink>
            <NavLink href="/changelog">Changelog</NavLink>
            <NavLink href="/support">Support</NavLink>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors">Dashboard</Link>
              <Link 
                href="/profile" 
                className="px-6 py-2.5 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95"
              >
                Profile
              </Link>
              <button
                onClick={async () => {
                  await fetch('/api/session', { method: 'DELETE', credentials: 'include' });
                  router.push('/');
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors">Sign In</Link>
              <Link 
                href="/register" 
                className="px-6 py-2.5 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-emerald-400 transition-all flex items-center gap-1.5 group"
    >
      <span className="w-1 h-1 bg-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      {children}
    </Link>
  );
}
