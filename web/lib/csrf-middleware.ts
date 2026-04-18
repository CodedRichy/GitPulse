/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens for state-changing operations (POST, PUT, DELETE, PATCH)
 * to prevent cross-site request forgery attacks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './csrf';

/**
 * Validate CSRF token from request
 */
export function validateCsrf(request: NextRequest): { valid: boolean; error?: string } {
  // Only validate state-changing methods
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return { valid: true }; // Safe methods don't need CSRF
  }

  // Get CSRF token from header
  const csrfToken = request.headers.get(CSRF_HEADER_NAME);
  
  if (!csrfToken) {
    return { 
      valid: false, 
      error: `Missing CSRF token. Include '${CSRF_HEADER_NAME}' header.` 
    };
  }

  // Get CSRF token from cookie
  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  
  if (!csrfCookie) {
    return { 
      valid: false, 
      error: 'CSRF cookie missing. Please refresh the page.' 
    };
  }

  // Verify token matches cookie
  if (!verifyCsrfToken(csrfToken, csrfCookie)) {
    return { 
      valid: false, 
      error: 'Invalid CSRF token. Please refresh the page and try again.' 
    };
  }

  return { valid: true };
}

/**
 * Create a 403 response for CSRF failure
 */
export function csrfErrorResponse(error: string): NextResponse {
  return NextResponse.json(
    { 
      error: 'CSRF validation failed',
      message: error,
      code: 'CSRF_INVALID'
    },
    { status: 403 }
  );
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 */
export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const csrfResult = validateCsrf(request);
    
    if (!csrfResult.valid) {
      return csrfErrorResponse(csrfResult.error!);
    }
    
    return handler(request);
  };
}
