import { randomBytes, createHash } from 'crypto';

// CSRF Token Configuration
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a CSRF token for storage (optional extra security)
 */
export function hashCsrfToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a CSRF token matches the stored value
 */
export function verifyCsrfToken(token: string, storedToken: string): boolean {
  // Use timing-safe comparison to prevent timing attacks
  const tokenHash = hashCsrfToken(token);
  return timingSafeEqual(tokenHash, storedToken);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Get CSRF token from request headers or body
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }
  
  // Check if it's in the body (for form submissions)
  // This would need to be parsed from the request body
  return null;
}

/**
 * Create CSRF cookie settings
 */
export function getCsrfCookieOptions(): {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
} {
  const token = generateCsrfToken();
  
  return {
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false, // Must be accessible by JavaScript for forms
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  };
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
