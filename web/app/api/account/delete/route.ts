import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limit: 3 requests per hour per IP (account deletion is sensitive)
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 });

/**
 * DELETE /api/account/delete
 * Deletes the current user's account.
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many account deletion attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }
      }
    );
  }

  try {
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = verifyToken(sessionCookie);

    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // Delete user from Supabase using service role key
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', sessionData.userId);

    if (error) throw error;

    // Clear session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('gitpulse_auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    response.headers.set('X-RateLimit-Limit', '3');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return response;
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
