// Simple in-memory rate limiter for API endpoints
// CRITICAL: In production with multiple instances, use Redis or similar distributed cache
// This in-memory store is lost on restart and doesn't share state across instances

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Security: Warn about production usage
if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  console.warn('⚠️  SECURITY WARNING: Using in-memory rate limiting in production.');
  console.warn('   This is vulnerable to bypass in multi-instance deployments.');
  console.warn('   Set REDIS_URL to use Redis-based rate limiting.');
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export function rateLimit(config: RateLimitConfig) {
  return (identifier: string): { success: boolean; remaining: number; resetTime: number } => {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    // Clean up expired entries
    if (entry && entry.resetTime < now) {
      rateLimitStore.delete(identifier);
    }

    const currentEntry = rateLimitStore.get(identifier) || { count: 0, resetTime: now + config.windowMs };

    if (currentEntry.count >= config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: currentEntry.resetTime,
      };
    }

    currentEntry.count++;
    rateLimitStore.set(identifier, currentEntry);

    return {
      success: true,
      remaining: config.maxRequests - currentEntry.count,
      resetTime: currentEntry.resetTime,
    };
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
