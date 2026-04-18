import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for auth middleware.');
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret();

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/subscription',
];

// Routes that should redirect to dashboard if already logged in
const AUTH_ROUTES = ['/login', '/register'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if route is protected
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route);
  
  // Get session cookie
  const token = request.cookies.get('gitpulse_auth')?.value;
  let isAuthenticated = false;
  
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }
  
  // Redirect unauthenticated users from protected routes
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect authenticated users away from auth routes
  if (isAuthRoute && isAuthenticated) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
  
  // Add auth status header for client-side use
  const response = NextResponse.next();
  response.headers.set('x-auth-status', isAuthenticated ? 'authenticated' : 'unauthenticated');
  
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/subscription/:path*',
    '/login',
    '/register',
  ],
};
