'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface CsrfContextType {
  csrfToken: string | null;
  isLoading: boolean;
}

const CsrfContext = createContext<CsrfContextType | undefined>(undefined);

/**
 * CSRF Provider - Makes CSRF token available to all forms
 */
export function CsrfProvider({ children }: { children: ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get CSRF token from cookie
    const getCsrfToken = () => {
      const match = document.cookie.match(/csrf_token=([^;]+)/);
      return match ? match[1] : null;
    };

    const token = getCsrfToken();
    setCsrfToken(token);
    setIsLoading(false);
  }, []);

  const value = {
    csrfToken,
    isLoading,
  };

  return (
    <CsrfContext.Provider value={value}>
      {children}
    </CsrfContext.Provider>
  );
}

/**
 * Hook to access CSRF token
 */
export function useCsrf() {
  const context = useContext(CsrfContext);
  if (context === undefined) {
    throw new Error('useCsrf must be used within a CsrfProvider');
  }
  return context;
}
