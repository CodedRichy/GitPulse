import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { validateEmail } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { verifyCsrfToken } from '@/lib/csrf';
import { logSupportTicketCreated } from '@/lib/audit';

// Verify reCAPTCHA v3 token with Google
async function verifyRecaptcha(token: string): Promise<{ success: boolean; score?: number; action?: string }> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.warn('RECAPTCHA_SECRET_KEY not set, skipping verification');
      return { success: true, score: 0.9 }; // Allow in dev if not configured
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return {
      success: data.success,
      score: data.score,
      action: data.action,
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false };
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limit: 5 requests per hour per IP
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 });

/**
 * GET /api/support
 * Get support ticket history for authenticated user
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: {
        'X-RateLimit-Limit': '5',
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

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('id, subject, message, status, priority, created_at, resolved_at')
      .eq('user_id', sessionData.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch support tickets:', error);
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }

    const response = NextResponse.json({ tickets: tickets || [] });
    response.headers.set('X-RateLimit-Limit', '5');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;

  } catch (error) {
    console.error('Support GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/support
 * Submit a support ticket (persists to database)
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many support requests. Please try again later.' },
      { status: 429, headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      }}
    );
  }

  try {
    const body = await request.json();
    const { name, email, message, subject = 'General Inquiry', recaptchaToken } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
    }

    // Verify CSRF token
    const csrfToken = request.headers.get('x-csrf-token');
    const csrfCookie = request.cookies.get('csrf_token')?.value;
    
    if (!csrfToken || !csrfCookie) {
      return NextResponse.json({ error: 'CSRF token missing' }, { status: 403 });
    }
    
    if (!verifyCsrfToken(csrfToken, csrfCookie)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Verify reCAPTCHA v3 token
    if (!recaptchaToken) {
      return NextResponse.json({ error: 'reCAPTCHA verification required' }, { status: 400 });
    }

    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    
    if (!recaptchaResult.success) {
      return NextResponse.json({ error: 'reCAPTCHA verification failed. Please try again.' }, { status: 400 });
    }

    // Check score (v3 returns score 0.0-1.0, 0.5 is Google's recommended threshold)
    if (recaptchaResult.score !== undefined && recaptchaResult.score < 0.5) {
      return NextResponse.json({ error: 'Suspicious activity detected. Please try again later.' }, { status: 403 });
    }

    // Try to get user ID if authenticated
    let userId: string | null = null;
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;
    if (sessionCookie) {
      const sessionData = verifyToken(sessionCookie);
      if (sessionData) {
        userId = sessionData.userId;
      }
    }

    // Save to database
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        name: name.substring(0, 100),
        email: email.toLowerCase().trim().substring(0, 255),
        subject: subject.substring(0, 200),
        message: message.substring(0, 5000),
        status: 'open',
        priority: 'medium',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save support ticket:', error);
      return NextResponse.json({ error: 'Failed to submit ticket' }, { status: 500 });
    }

    // Log support ticket creation
    await logSupportTicketCreated(request, userId, ticket?.id || '', subject);

    // In production, you would also:
    // 1. Send email notification to support team
    // 2. Send confirmation email to user
    // 3. Post to Slack/Discord webhook

    const response = NextResponse.json({
      success: true,
      ticketId: ticket?.id,
      message: 'Support ticket submitted successfully. We will respond within 12 hours.',
    });
    response.headers.set('X-RateLimit-Limit', '5');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;

  } catch (error) {
    console.error('Support POST error:', error);
    return NextResponse.json({ error: 'Failed to submit support ticket' }, { status: 500 });
  }
}
