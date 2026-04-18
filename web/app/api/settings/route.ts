import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { validateEmail, validateUUID } from '@/lib/validation';
import { logSettingsUpdated } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf-middleware';
import { apiLoggers } from '@/lib/logger';

const log = apiLoggers.settings;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limit: 20 requests per minute per IP
const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 20 });

/**
 * GET /api/settings
 * Returns user settings.
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Rate limiting
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    const duration = performance.now() - startTime;
    log.logSecurity('Rate limit exceeded on GET', { ip, durationMs: Math.round(duration) });
    
    return NextResponse.json(
      { error: 'Too many requests' },
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
    log.logRequest('GET', '/api/settings', { ip });
    
    // Security: Verify JWT token instead of parsing as JSON
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const duration = performance.now() - startTime;
      log.logResponse(401, '/api/settings', Math.round(duration), { ip, reason: 'unauthorized' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const sessionData = verifyToken(token);
    
    if (!sessionData || !sessionData.userId) {
      const duration = performance.now() - startTime;
      log.logResponse(401, '/api/settings', Math.round(duration), { ip, reason: 'invalid_token' });
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('email, github_login, name, avatar_url, tier')
      .eq('id', sessionData.userId)
      .single();

    if (error) throw error;

    const duration = performance.now() - startTime;
    log.logResponse(200, '/api/settings', Math.round(duration), { 
      ip, 
      userId: sessionData.userId 
    });

    return NextResponse.json({
      email: user.email,
      github_login: user.github_login,
      name: user.name,
      avatar_url: user.avatar_url,
      tier: user.tier,
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log.error('Settings API GET error', errorMsg, {
      ip,
      durationMs: Math.round(duration)
    });
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Updates user settings.
 */
export async function POST(request: NextRequest) {
  // Security: Validate CSRF token for state-changing operation
  const csrfResult = validateCsrf(request);
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error!);
  }

  const startTime = performance.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Rate limiting
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    const duration = performance.now() - startTime;
    log.logSecurity('Rate limit exceeded on POST', { ip, durationMs: Math.round(duration) });
    
    return NextResponse.json(
      { error: 'Too many requests' },
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
    log.logRequest('POST', '/api/settings', { ip });
    
    const { userId, email } = await request.json();

    if (!userId || !email) {
      const duration = performance.now() - startTime;
      log.logResponse(400, '/api/settings', Math.round(duration), { 
        ip, 
        reason: 'missing_fields' 
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!validateUUID(userId)) {
      const duration = performance.now() - startTime;
      log.logResponse(400, '/api/settings', Math.round(duration), { 
        ip, 
        reason: 'invalid_userId' 
      });
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!validateEmail(email)) {
      const duration = performance.now() - startTime;
      log.logResponse(400, '/api/settings', Math.round(duration), { 
        ip, 
        reason: 'invalid_email' 
      });
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Update user email in Supabase
    const { data, error } = await supabase
      .from('users')
      .update({ email, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log settings update
    await logSettingsUpdated(request, userId, { email });

    const duration = performance.now() - startTime;
    log.logResponse(200, '/api/settings', Math.round(duration), { 
      ip, 
      userId,
      action: 'settings_updated' 
    });

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      user: data,
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log.error('Settings API POST error', errorMsg, {
      ip,
      durationMs: Math.round(duration)
    });
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
