import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { logConfigUpdated } from '@/lib/audit';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf-middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Fetch config from Supabase
    const { data: userConfig, error } = await supabase
      .from('user_configs')
      .select('config')
      .eq('user_id', sessionData.userId)
      .single();

    if (error) {
      // If no config exists, return default config
      if (error.code === 'PGRST116') {
        const defaultConfig = {
          version: 1,
          tier: 'free',
          quality_gates: {
            'security-scan': { enabled: true, severity: 'critical' },
            'code-smells': { enabled: true, severity: 'high' },
            'test-coverage': { enabled: true, severity: 'medium' },
            'documentation': { enabled: true, severity: 'low' },
          },
          custom_gates: [],
          conventions: {
            commit_style: 'conventional',
            enforce_scope: false,
            allowed_types: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
            auto_learn: true,
          },
          hooks: {
            pre_commit: true,
            commit_msg: true,
          },
        };
        return NextResponse.json({ config: defaultConfig });
      }
      throw error;
    }

    return NextResponse.json({ config: userConfig?.config || {} });
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
  // Security: Validate CSRF token for state-changing operation
  const csrfResult = validateCsrf(request);
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error!);
  }

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

    // Fetch current config to check tier
    const { data: currentConfig, error: fetchError } = await supabase
      .from('user_configs')
      .select('config')
      .eq('user_id', sessionData.userId)
      .single();

    const existingConfig = currentConfig?.config || {};
    const tier = existingConfig.tier || 'free';

    // Check tier - only Pro and Team can modify config via API
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Config editing requires Pro or Team tier' },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Merge updates with existing config
    const mergedConfig = {
      ...existingConfig,
      ...updates,
      version: (existingConfig.version || 1) + 1,
    };

    // Upsert config to Supabase
    const { error: upsertError } = await supabase
      .from('user_configs')
      .upsert(
        {
          user_id: sessionData.userId,
          config: mergedConfig,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      throw upsertError;
    }

    // Log config update
    await logConfigUpdated(request, sessionData.userId, updates);

    const response = NextResponse.json({ success: true, config: mergedConfig });
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
