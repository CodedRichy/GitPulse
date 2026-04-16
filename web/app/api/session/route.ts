import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key to bypass RLS policies
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/session
 * Returns current session user from cookie.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const sessionData = verifyToken(sessionCookie);
    if (!sessionData) {
      return NextResponse.json({ user: null, error: 'Invalid or expired session' }, { status: 401 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, github_id, github_login, name, email, avatar_url, tier, created_at')
      .eq('id', sessionData.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
      }
    });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

/**
 * DELETE /api/session
 * Clears the session cookie (logout).
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Clear both old and new cookie names
  response.cookies.set('gitpulse_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('gitpulse_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
