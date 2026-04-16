'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // In production, send to error tracking service like Sentry
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-red-500 mb-4 uppercase tracking-tighter">System_Error</h2>
            <p className="text-stone-500 mb-8">Something went wrong. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-emerald-500 text-[#09090B] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white transition-all"
            >
              Reload_System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
