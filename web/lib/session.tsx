'use client';

import { createContext, useContext, ReactNode } from 'react';
import useSWR from 'swr';

interface User {
  id: string;
  github_id?: number;
  github_login?: string;
  email?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  tier?: string;
  created_at?: string;
}

interface SessionContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  mutate: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const error = new Error('Not authenticated');
    throw error;
  }
  return res.json();
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR('/api/session', fetcher, {
    refreshInterval: 30000, // 30 seconds
    dedupingInterval: 2000,  // Dedupe requests within 2s
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    suspense: false,
  });

  const value = {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user && !error,
    error: error || null,
    mutate,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
