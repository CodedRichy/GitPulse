import { useState, useEffect, useCallback } from 'react';
import { ProviderHealth, getGlobalHealthManager } from '../ai/provider-health.js';

interface FallbackInfo {
  from: string;
  to: string;
  reason: string;
}

export function useProviderHealth() {
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [fallbackInfo, setFallbackInfo] = useState<FallbackInfo | null>(null);
  const healthManager = getGlobalHealthManager();

  const refreshHealth = useCallback(async () => {
    await healthManager.checkAllHealth();
    setProviderHealth(healthManager.getAllHealth());
  }, [healthManager]);

  const showFallback = useCallback((from: string, to: string, reason: string) => {
    setFallbackInfo({ from, to, reason });
    // Auto-clear after 10 seconds
    setTimeout(() => {
      setFallbackInfo(null);
    }, 10000);
  }, []);

  const clearFallback = useCallback(() => {
    setFallbackInfo(null);
  }, []);

  const getProviderStatus = useCallback((modelAlias: string) => {
    // Map model alias to provider
    let providerName: string | null = null;
    
    if (modelAlias.includes('openrouter') || modelAlias.startsWith('nvidia/') || modelAlias.startsWith('google/gemma')) {
      providerName = 'openrouter';
    } else if (modelAlias.includes('groq') || modelAlias.startsWith('llama-') || modelAlias.startsWith('meta-llama')) {
      providerName = 'groq';
    } else if (modelAlias.includes('gemini')) {
      providerName = 'google';
    } else if (modelAlias.includes('gpt')) {
      providerName = 'openai';
    } else if (!modelAlias.includes('/')) {
      // Assume Ollama for simple model names
      providerName = 'ollama';
    }

    if (!providerName) return { healthy: true, circuitOpen: false, latency: 0 };

    const health = providerHealth.find(h => h.name === providerName);
    if (!health) return { healthy: true, circuitOpen: false, latency: 0 };

    return {
      healthy: health.available && !health.circuitOpen,
      circuitOpen: health.circuitOpen,
      latency: health.averageLatencyMs,
    };
  }, [providerHealth]);

  const getHealthIndicator = useCallback((status: { healthy: boolean; circuitOpen: boolean; latency: number }): string => {
    if (status.circuitOpen) return '🔴';
    if (!status.healthy) return '🟡';
    if (status.latency > 5000) return '🐌';
    if (status.latency < 1000) return '⚡';
    return '🟢';
  }, []);

  useEffect(() => {
    // Initial health check
    refreshHealth();

    // Start background polling
    healthManager.startHealthPolling();
    
    // Refresh every 30 seconds
    const interval = setInterval(refreshHealth, 30000);

    return () => {
      clearInterval(interval);
      // Don't stop polling - other components might use it
    };
  }, [healthManager, refreshHealth]);

  return {
    providerHealth,
    fallbackInfo,
    refreshHealth,
    showFallback,
    clearFallback,
    getProviderStatus,
    getHealthIndicator,
  };
}
