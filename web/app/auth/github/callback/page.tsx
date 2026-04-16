'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GitHubCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const savedState = sessionStorage.getItem('github_oauth_state');

        // Verify state parameter for security
        if (!state || state !== savedState) {
          throw new Error('Invalid state parameter');
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Navigate to API endpoint which will set cookie and redirect
        // Using window.location for full page navigation to properly handle cookies
        sessionStorage.removeItem('github_oauth_state');
        window.location.href = `/api/auth/github?code=${encodeURIComponent(code)}`;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {error ? (
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <p className="text-stone-500 dark:text-stone-400">Redirecting to login...</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-stone-500 dark:text-stone-400">Completing authentication...</p>
        </div>
      )}
    </div>
  );
}
