import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/telemetry-client';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';

// Rate limit: 30 requests per minute per IP
const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 30 });

/**
 * GET /api/analytics?days=30
 * Returns analytics data from local telemetry file.
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '30',
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

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter (must be between 1 and 365)' },
        { status: 400 }
      );
    }

    // Get analytics data from client (which will call CLI in production)
    const { analytics, recentRuns } = await getAnalytics(days);

    const response = NextResponse.json({
      analytics,
      recentRuns,
      tier: analytics.contributors ? 'team' : 'pro',
    });
    response.headers.set('X-RateLimit-Limit', '30');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
