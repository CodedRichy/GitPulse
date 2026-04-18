import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { validateCode } from '@/lib/validation';
import { getCsrfCookieOptions } from '@/lib/csrf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key for server-side auth operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limit: 10 requests per 15 minutes per IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 });

// Shared handler for both GET and POST
async function handleAuth(request: NextRequest, code: string) {
  // Rate limiting based on IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }
      }
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'Failed to exchange token');
    }

    // Get user information
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Save or update user in Supabase
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('github_id', userData.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let userRecord;

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          github_login: userData.login,
          name: userData.name,
          email: userData.email,
          avatar_url: userData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) throw updateError;
      userRecord = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          github_id: userData.id,
          github_login: userData.login,
          name: userData.name,
          email: userData.email,
          avatar_url: userData.avatar_url,
          tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      userRecord = newUser;
    }

    // Create JWT session token
    const sessionToken = generateToken({
      userId: userRecord.id,
    });

    const isSecureCookie = process.env.NODE_ENV === 'production';
    const csrfCookie = getCsrfCookieOptions();

    // Create redirect response and set cookies on it
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url), 307);
    
    // Set auth cookie with strict security settings
    redirectResponse.cookies.set('gitpulse_auth', sessionToken, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'strict', // Security: Changed from 'lax' to 'strict' for better CSRF protection
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds (reduced from 30)
      path: '/',
    });
    
    // Set CSRF cookie (not httpOnly so JS can read it)
    redirectResponse.cookies.set(csrfCookie.name, csrfCookie.value, {
      httpOnly: csrfCookie.httpOnly,
      secure: isSecureCookie,
      sameSite: csrfCookie.sameSite,
      maxAge: csrfCookie.maxAge,
      path: csrfCookie.path,
    });
    
    redirectResponse.headers.set('X-RateLimit-Limit', '10');
    redirectResponse.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    redirectResponse.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return redirectResponse;
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    );
  }
}

// POST handler for JSON requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;
    if (!code || !validateCode(code)) {
      return NextResponse.json({ error: 'Invalid authorization code' }, { status: 400 });
    }
    return handleAuth(request, code);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// GET handler for redirect from callback page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code || !validateCode(code)) {
    return NextResponse.redirect(new URL('/login?error=invalid_code', request.url));
  }
  return handleAuth(request, code);
}
