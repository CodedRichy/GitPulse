import { AIProvider } from '../core/models.js';
import { AIProviderFactory } from './providers.js';

export interface ProviderHealth {
  name: string;
  available: boolean;
  latencyMs: number;
  lastError?: string;
  lastSuccess?: Date;
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpensAt: number; // Failure threshold
  circuitTimeoutMs: number; // How long to keep circuit open
  circuitOpenedAt?: Date;
  totalRequests: number;
  successfulRequests: number;
  averageLatencyMs: number;
}

export interface ProviderWithHealth {
  provider: AIProvider;
  health: ProviderHealth;
}

interface HealthCheckConfig {
  circuitOpensAt: number;
  circuitTimeoutMs: number;
  healthCheckIntervalMs: number;
  latencyWindowSize: number;
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  circuitOpensAt: 3, // Open circuit after 3 consecutive failures
  circuitTimeoutMs: 300000, // 5 minutes
  healthCheckIntervalMs: 30000, // 30 seconds
  latencyWindowSize: 10, // Keep last 10 latency measurements
};

/**
 * Provider Health Manager - Circuit breaker pattern with health tracking
 */
export class ProviderHealthManager {
  private healthMap: Map<string, ProviderHealth> = new Map();
  private latencyWindows: Map<string, number[]> = new Map();
  private config: HealthCheckConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private providerConfigs: Map<string, any> = new Map();

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a provider configuration for health checking
   */
  registerProvider(name: string, config: any): void {
    this.providerConfigs.set(name, config);
    if (!this.healthMap.has(name)) {
      this.healthMap.set(name, this.createInitialHealth(name));
      this.latencyWindows.set(name, []);
    }
  }

  /**
   * Get or create initial health state for a provider
   */
  private createInitialHealth(name: string): ProviderHealth {
    return {
      name,
      available: true, // Assume available until proven otherwise
      latencyMs: 0,
      consecutiveFailures: 0,
      circuitOpen: false,
      circuitOpensAt: this.config.circuitOpensAt,
      circuitTimeoutMs: this.config.circuitTimeoutMs,
      totalRequests: 0,
      successfulRequests: 0,
      averageLatencyMs: 0,
    };
  }

  /**
   * Check if a provider's circuit is closed (available for use)
   */
  isCircuitClosed(name: string): boolean {
    const health = this.healthMap.get(name);
    if (!health) return true; // Unknown providers are assumed OK

    if (!health.circuitOpen) return true;

    // Check if circuit should be half-open (timeout expired)
    if (health.circuitOpenedAt) {
      const elapsed = Date.now() - health.circuitOpenedAt.getTime();
      if (elapsed > health.circuitTimeoutMs) {
        // Try half-open: mark as potentially available for one test
        return true;
      }
    }

    return false;
  }

  /**
   * Record a successful request
   */
  recordSuccess(name: string, latencyMs: number): void {
    const health = this.healthMap.get(name) || this.createInitialHealth(name);
    
    health.consecutiveFailures = 0;
    health.circuitOpen = false;
    health.circuitOpenedAt = undefined;
    health.lastSuccess = new Date();
    health.totalRequests++;
    health.successfulRequests++;
    health.latencyMs = latencyMs;

    // Update rolling average latency
    const window = this.latencyWindows.get(name) || [];
    window.push(latencyMs);
    if (window.length > this.config.latencyWindowSize) {
      window.shift();
    }
    this.latencyWindows.set(name, window);
    health.averageLatencyMs = window.reduce((a, b) => a + b, 0) / window.length;

    this.healthMap.set(name, health);
  }

  /**
   * Record a failed request
   */
  recordFailure(name: string, error: string): void {
    const health = this.healthMap.get(name) || this.createInitialHealth(name);
    
    health.consecutiveFailures++;
    health.lastError = error;
    health.totalRequests++;
    health.latencyMs = Infinity;

    // Check if we should open the circuit
    if (health.consecutiveFailures >= health.circuitOpensAt) {
      health.circuitOpen = true;
      health.circuitOpenedAt = new Date();
    }

    this.healthMap.set(name, health);
  }

  /**
   * Get health score for ranking (0-100)
   * Higher is better. Considers: availability, success rate, latency
   */
  getHealthScore(name: string): number {
    const health = this.healthMap.get(name);
    if (!health) return 50; // Neutral score for unknown

    if (health.circuitOpen) return 0;

    // Base score from success rate (40% weight)
    const successRate = health.totalRequests > 0
      ? (health.successfulRequests / health.totalRequests) * 40
      : 40;

    // Latency score (30% weight) - faster is better
    // <1s = 30pts, 1-3s = 20pts, 3-5s = 10pts, >5s = 0pts
    let latencyScore = 0;
    if (health.averageLatencyMs < 1000) latencyScore = 30;
    else if (health.averageLatencyMs < 3000) latencyScore = 20;
    else if (health.averageLatencyMs < 5000) latencyScore = 10;

    // Recency bonus (20% weight) - recently used is slightly preferred
    const recencyScore = health.lastSuccess && 
      (Date.now() - health.lastSuccess.getTime()) < 60000 ? 20 : 10;

    // Stability bonus (10% weight) - no recent failures
    const stabilityScore = health.consecutiveFailures === 0 ? 10 : 0;

    return successRate + latencyScore + recencyScore + stabilityScore;
  }

  /**
   * Get all providers ranked by health score (best first)
   */
  getRankedProviders(providerNames: string[]): string[] {
    return providerNames
      .filter(name => this.isCircuitClosed(name))
      .sort((a, b) => this.getHealthScore(b) - this.getHealthScore(a));
  }

  /**
   * Get the best available provider
   */
  getBestProvider(providerNames: string[]): string | null {
    const ranked = this.getRankedProviders(providerNames);
    return ranked.length > 0 ? ranked[0] : null;
  }

  /**
   * Get health status for all registered providers
   */
  getAllHealth(): ProviderHealth[] {
    return Array.from(this.healthMap.values());
  }

  /**
   * Get health for a specific provider
   */
  getHealth(name: string): ProviderHealth | undefined {
    return this.healthMap.get(name);
  }

  /**
   * Perform health check on all registered providers
   */
  async checkAllHealth(): Promise<void> {
    const checks = Array.from(this.providerConfigs.entries()).map(async ([name, config]) => {
      const startTime = Date.now();
      try {
        const provider = AIProviderFactory.create(name as any, config);
        const available = await provider.isAvailable();
        const latency = Date.now() - startTime;

        if (available) {
          this.recordSuccess(name, latency);
        } else {
          this.recordFailure(name, 'Health check returned unavailable');
        }
      } catch (error) {
        this.recordFailure(name, error instanceof Error ? error.message : 'Unknown error');
      }
    });

    await Promise.allSettled(checks);
  }

  /**
   * Start background health polling
   */
  startHealthPolling(): void {
    this.stopHealthPolling();
    this.healthCheckInterval = setInterval(() => {
      this.checkAllHealth().catch(() => {
        // Silently ignore polling errors
      });
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Stop background health polling
   */
  stopHealthPolling(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Reset all health data (for testing or reconfiguration)
   */
  reset(): void {
    this.healthMap.clear();
    this.latencyWindows.clear();
    this.providerConfigs.clear();
  }
}

// Singleton instance for global use
let globalHealthManager: ProviderHealthManager | null = null;

export function getGlobalHealthManager(): ProviderHealthManager {
  if (!globalHealthManager) {
    globalHealthManager = new ProviderHealthManager();
  }
  return globalHealthManager;
}

export function resetGlobalHealthManager(): void {
  globalHealthManager?.stopHealthPolling();
  globalHealthManager = null;
}
