import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limit: 10 requests per minute per IP
const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 10 });

// Generate a secure API key
function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const prefix = 'gp_';
  const randomPart = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url');
  const fullKey = `${prefix}${randomPart}`;
  const keyPrefix = fullKey.substring(0, 12); // gp_ + 8 chars
  
  // Hash the key for storage (bcrypt with salt rounds 10)
  const hash = bcrypt.hashSync(fullKey, 10);
  
  return { fullKey, prefix: keyPrefix, hash };
}

/**
 * GET /api/keys
 * List all API keys for the authenticated user
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      }}
    );
  }

  try {
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = verifyToken(sessionCookie);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at')
      .eq('user_id', sessionData.userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 });
    }

    const response = NextResponse.json({ keys: keys || [] });
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;

  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      }}
    );
  }

  try {
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = verifyToken(sessionCookie);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = body.name?.trim() || 'API Key';

    // Generate the key
    const { fullKey, prefix, hash } = generateApiKey();

    // Store in database
    const { data: key, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: sessionData.userId,
        key_hash: hash,
        key_prefix: prefix,
        name: name.substring(0, 100), // Limit length
      })
      .select('id, name, key_prefix, created_at')
      .single();

    if (error || !key) {
      console.error('Failed to create API key:', error);
      return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
    }

    const response = NextResponse.json({ 
      key: {
        ...key,
        full_key: fullKey, // Only returned once on creation
      }
    });
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;

  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/keys?id=<key_id>
 * Revoke an API key
 */
export async function DELETE(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      }}
    );
  }

  try {
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = verifyToken(sessionCookie);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }

    // Soft delete by setting revoked_at
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', sessionData.userId); // Ensure user owns the key

    if (error) {
      console.error('Failed to revoke API key:', error);
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;

  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
