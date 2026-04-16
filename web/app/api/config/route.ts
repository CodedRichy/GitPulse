import { NextRequest, NextResponse } from 'next/server';
import { getConfig, updateConfig } from '@/lib/telemetry-client';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';

// Rate limit: 20 requests per minute per IP
const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 20 });

/**
 * GET /api/config
 * Returns current GitPulse configuration.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = verifyToken(sessionCookie);

    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { config } = await getConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Failed to load config' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config
 * Updates GitPulse configuration.
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '20',
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

    const { config } = await getConfig();

    // Check tier - only Pro and Team can modify config via API
    const tier = config.tier || 'free';
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Config editing requires Pro or Team tier' },
        { status: 403 }
      );
    }

    const updates = await request.json();
    await updateConfig(updates);

    const response = NextResponse.json({ success: true });
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
