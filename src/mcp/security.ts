/**
 * MCP Server Security Layer
 *
 * Provides authentication and rate limiting for MCP tools.
 * This adds a security boundary to prevent unauthorized access
 * and resource exhaustion attacks.
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration for MCP security
 */
export interface MCPSecurityConfig {
  enabled: boolean;
  authToken?: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  requireAuth: boolean;
}

/**
 * Rate limit entry for tracking requests
 */
interface RateLimitEntry {
  timestamps: number[];
  blocked: boolean;
  blockExpiry?: number;
}

/**
 * Security context for a request
 */
export interface SecurityContext {
  authenticated: boolean;
  rateLimitHit: boolean;
  error?: string;
}

/**
 * Default security configuration
 */
const DEFAULT_CONFIG: MCPSecurityConfig = {
  enabled: true,
  rateLimitWindowMs: 60000, // 1 minute
  rateLimitMaxRequests: 30, // 30 requests per minute per tool
  requireAuth: false, // Disabled by default for local dev, enable for remote
};

/**
 * Manages MCP server security (authentication + rate limiting)
 */
export class MCPSecurity {
  private config: MCPSecurityConfig;
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private tokenFile: string;

  constructor(config?: Partial<MCPSecurityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokenFile = path.join(os.homedir(), '.gitpulse', '.mcp-token');
    
    // Ensure auth token exists if auth is enabled
    if (this.config.requireAuth && !this.config.authToken) {
      this.config.authToken = this.getOrCreateToken();
    }
  }

  /**
   * Get or create authentication token
   */
  private getOrCreateToken(): string {
    if (fs.existsSync(this.tokenFile)) {
      return fs.readFileSync(this.tokenFile, 'utf-8').trim();
    }
    
    // Generate new token
    const token = randomBytes(32).toString('hex');
    
    // Ensure directory exists
    const dir = path.dirname(this.tokenFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write with restrictive permissions
    fs.writeFileSync(this.tokenFile, token, { mode: 0o600 });
    
    return token;
  }

  /**
   * Validate authentication token
   */
  validateAuth(token: string): boolean {
    if (!this.config.requireAuth) {
      return true;
    }
    
    const expectedToken = this.config.authToken || this.getOrCreateToken();
    
    // Timing-safe comparison to prevent timing attacks
    try {
      const expected = Buffer.from(expectedToken, 'utf-8');
      const provided = Buffer.from(token, 'utf-8');
      
      if (expected.length !== provided.length) {
        return false;
      }
      
      return timingSafeEqual(expected, provided);
    } catch {
      return false;
    }
  }

  /**
   * Check and update rate limit for a tool
   */
  checkRateLimit(toolName: string): { allowed: boolean; remaining: number; resetIn: number } {
    if (!this.config.enabled) {
      return { allowed: true, remaining: this.config.rateLimitMaxRequests, resetIn: 0 };
    }

    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;
    
    // Get or create rate limit entry
    let entry = this.rateLimits.get(toolName);
    if (!entry) {
      entry = { timestamps: [], blocked: false };
      this.rateLimits.set(toolName, entry);
    }
    
    // Check if currently blocked
    if (entry.blocked && entry.blockExpiry && entry.blockExpiry > now) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.blockExpiry - now
      };
    }
    
    // Clear block if expired
    if (entry.blocked) {
      entry.blocked = false;
      entry.blockExpiry = undefined;
    }
    
    // Clean old timestamps outside window
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
    
    // Check if limit exceeded
    if (entry.timestamps.length >= this.config.rateLimitMaxRequests) {
      // Block for the remainder of the window
      entry.blocked = true;
      entry.blockExpiry = now + this.config.rateLimitWindowMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetIn: this.config.rateLimitWindowMs
      };
    }
    
    // Record this request
    entry.timestamps.push(now);
    
    return {
      allowed: true,
      remaining: this.config.rateLimitMaxRequests - entry.timestamps.length,
      resetIn: this.config.rateLimitWindowMs
    };
  }

  /**
   * Authenticate and validate rate limit in one call
   */
  validateRequest(toolName: string, authToken?: string): SecurityContext {
    // Check authentication if required
    if (this.config.requireAuth) {
      if (!authToken || !this.validateAuth(authToken)) {
        return {
          authenticated: false,
          rateLimitHit: false,
          error: 'Unauthorized - invalid or missing authentication token'
        };
      }
    }
    
    // Check rate limit
    const rateLimit = this.checkRateLimit(toolName);
    if (!rateLimit.allowed) {
      return {
        authenticated: true,
        rateLimitHit: true,
        error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds`
      };
    }
    
    return {
      authenticated: true,
      rateLimitHit: false
    };
  }

  /**
   * Get current security status for monitoring
   */
  getStatus(): {
    enabled: boolean;
    requireAuth: boolean;
    totalRateLimitedTools: number;
    config: Omit<MCPSecurityConfig, 'authToken'>;
  } {
    return {
      enabled: this.config.enabled,
      requireAuth: this.config.requireAuth,
      totalRateLimitedTools: this.rateLimits.size,
      config: {
        enabled: this.config.enabled,
        rateLimitWindowMs: this.config.rateLimitWindowMs,
        rateLimitMaxRequests: this.config.rateLimitMaxRequests,
        requireAuth: this.config.requireAuth,
      }
    };
  }

  /**
   * Reset rate limits (useful for testing)
   */
  resetRateLimits(): void {
    this.rateLimits.clear();
  }

  /**
   * Generate security headers for responses
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }
}

export default MCPSecurity;
