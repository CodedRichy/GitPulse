import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';
import { apiLoggers } from '@/lib/logger';

const log = apiLoggers.health;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Rate limit: 30 requests per minute per IP (health checks can be frequent)
const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 30 });

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Rate limiting
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    const duration = performance.now() - startTime;
    log.logSecurity('Rate limit exceeded', { ip, durationMs: Math.round(duration) });
    
    return NextResponse.json(
      { status: 'rate_limited', error: 'Too many health checks' },
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
    log.logRequest('GET', '/api/health', { ip });

    // Check Supabase connection
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      const duration = performance.now() - startTime;
      log.logResponse(503, '/api/health', Math.round(duration), {
        error: 'Database connection failed',
        ip
      });

      return NextResponse.json(
        { status: 'unhealthy', error: 'Database connection failed' },
        { status: 503 }
      );
    }

    const duration = performance.now() - startTime;
    log.logResponse(200, '/api/health', Math.round(duration), { ip });

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
      },
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    log.error('Health check failed', error, {
      ip,
      durationMs: Math.round(duration)
    });

    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed' },
      { status: 503 }
    );
  }
}
