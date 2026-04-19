import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 30 });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);
  
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

    const { id: teamId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Check membership
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', sessionData.userId)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // TODO: Replace with actual audit_log queries when table is populated
    // For now, return placeholder data structure
    const analyticsResponse = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      summary: {
        totalRuns: 0,
        averageScore: 85,
        passRate: 92,
        secretsPrevented: 0,
        overridesUsed: 0,
      },
      trends: {
        scoreTrend: 0,
        passRateTrend: 0,
        volumeTrend: 0,
      },
      byMember: [],
      byRepo: [],
      byGate: {
        'security-scan': { runs: 0, passRate: 100, failures: 0 },
        'code-smells': { runs: 0, passRate: 100, failures: 0 },
        'test-coverage': { runs: 0, passRate: 100, failures: 0 },
        'documentation': { runs: 0, passRate: 100, failures: 0 },
      },
    };

    return NextResponse.json(analyticsResponse);
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
