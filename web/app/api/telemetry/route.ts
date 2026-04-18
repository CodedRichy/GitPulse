import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limit: 100 requests per hour per IP (CLI sync)
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 100 });

/**
 * POST /api/telemetry
 * Receive telemetry data from CLI sync
 * Authenticates via API key in Authorization header
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      }}
    );
  }

  try {
    // Authenticate via API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer '
    
    // Validate API key format
    if (!apiKey.startsWith('gp_') || apiKey.length < 20) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 });
    }

    // Find key by prefix and verify hash (include team_id for team routing)
    const keyPrefix = apiKey.substring(0, 12); // gp_ + 8 chars
    const { data: keys, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, key_hash, revoked_at, key_type, team_id')
      .eq('key_prefix', keyPrefix)
      .is('revoked_at', null);

    if (keyError || !keys || keys.length === 0) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Security: Verify the full key against hash using constant-time comparison
    // This prevents timing attacks that could enumerate valid API keys
    let validKey = null;
    let compareTime = 0;
    
    for (const key of keys) {
      const startCompare = process.hrtime.bigint();
      const isMatch = bcrypt.compareSync(apiKey, key.key_hash);
      const endCompare = process.hrtime.bigint();
      compareTime += Number(endCompare - startCompare);
      
      if (isMatch) {
        validKey = key;
        // Continue comparing to prevent timing attacks (optional: add artificial delay)
      }
    }
    
    // Add artificial delay to make all requests take similar time (prevents timing attacks)
    const minCompareTime = 50; // minimum 50ms
    if (compareTime < minCompareTime * 1000000) { // convert ms to nanoseconds
      await new Promise(resolve => setTimeout(resolve, minCompareTime - (compareTime / 1000000)));
    }

    if (!validKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', validKey.id);

    // Parse telemetry data
    const body = await request.json();
    const {
      timestamp,
      repo_name,
      repo_path_hash,
      branch,
      commit_hash,
      score,
      passed,
      duration_ms,
      gates,
      total_issues,
      critical_issues,
      high_issues,
      medium_issues,
      low_issues,
      client_version,
    } = body;

    // Validate required fields
    if (!timestamp || typeof score !== 'number' || typeof passed !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert telemetry run (include team_id for team API keys)
    const { data: run, error: insertError } = await supabase
      .from('telemetry_runs')
      .insert({
        user_id: validKey.user_id,
        team_id: validKey.team_id, // NULL for personal keys, set for team keys
        timestamp: new Date(timestamp).toISOString(),
        repo_name: repo_name?.substring(0, 255),
        repo_path_hash: repo_path_hash?.substring(0, 64),
        branch: branch?.substring(0, 255),
        commit_hash: commit_hash?.substring(0, 40),
        score: Math.max(0, Math.min(100, Math.round(score))),
        passed,
        duration_ms: duration_ms || 0,
        gates: gates || {},
        total_issues: total_issues || 0,
        critical_issues: critical_issues || 0,
        high_issues: high_issues || 0,
        medium_issues: medium_issues || 0,
        low_issues: low_issues || 0,
        client_version: client_version?.substring(0, 20),
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle duplicate (constraint violation)
      if (insertError.code === '23505') {
        return NextResponse.json({ 
          success: true, 
          warning: 'Duplicate run - already synced',
          id: null 
        });
      }
      console.error('Failed to insert telemetry:', insertError);
      return NextResponse.json({ error: 'Failed to save telemetry' }, { status: 500 });
    }

    const response = NextResponse.json({ 
      success: true, 
      id: run?.id 
    });
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;

  } catch (error) {
    console.error('Telemetry POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/telemetry?days=30
 * Get telemetry history for authenticated web user
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      }}
    );
  }

  try {
    // Authenticate via session cookie (web dashboard)
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = verifyToken(sessionCookie);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    // Calculate cutoff date
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data: runs, error } = await supabase
      .from('telemetry_runs')
      .select('*')
      .eq('user_id', sessionData.userId)
      .gte('timestamp', cutoff.toISOString())
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch telemetry:', error);
      return NextResponse.json({ error: 'Failed to fetch telemetry' }, { status: 500 });
    }

    // Calculate analytics
    const analytics = calculateAnalytics(runs || [], days);

    const response = NextResponse.json({ 
      runs: runs || [],
      analytics 
    });
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    return response;

  } catch (error) {
    console.error('Telemetry GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Calculate analytics from runs (matching CLI format)
function calculateAnalytics(runs: any[], days: number) {
  if (runs.length === 0) {
    return {
      period: { start: new Date().toISOString(), end: new Date().toISOString(), days },
      totalRuns: 0,
      averageScore: 0,
      scoreTrend: 0,
      passRate: 0,
      gateAverages: {},
      topIssues: [],
    };
  }

  const sortedRuns = [...runs].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const startDate = new Date(sortedRuns[0].timestamp);
  const endDate = new Date(sortedRuns[sortedRuns.length - 1].timestamp);

  const totalScore = runs.reduce((sum, r) => sum + r.score, 0);
  const averageScore = Math.round(totalScore / runs.length);

  const passedRuns = runs.filter(r => r.passed).length;
  const passRate = Math.round((passedRuns / runs.length) * 100);

  // Gate averages
  const gateScores: Record<string, number[]> = {};
  for (const run of runs) {
    if (run.gates) {
      for (const [gateName, score] of Object.entries(run.gates)) {
        if (!gateScores[gateName]) gateScores[gateName] = [];
        gateScores[gateName].push(typeof score === 'number' ? score : 0);
      }
    }
  }

  const gateAverages: Record<string, number> = {};
  for (const [gateName, scores] of Object.entries(gateScores)) {
    gateAverages[gateName] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // Score trend (first week vs last week)
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const firstWeekEnd = startDate.getTime() + weekMs;
  const lastWeekStart = endDate.getTime() - weekMs;

  const firstWeekScores = runs.filter(r => new Date(r.timestamp).getTime() <= firstWeekEnd).map(r => r.score);
  const lastWeekScores = runs.filter(r => new Date(r.timestamp).getTime() >= lastWeekStart).map(r => r.score);

  const firstWeekAvg = firstWeekScores.length > 0 
    ? firstWeekScores.reduce((a, b) => a + b, 0) / firstWeekScores.length 
    : averageScore;
  const lastWeekAvg = lastWeekScores.length > 0 
    ? lastWeekScores.reduce((a, b) => a + b, 0) / lastWeekScores.length 
    : averageScore;

  const scoreTrend = firstWeekAvg > 0 
    ? Math.round(((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100) 
    : 0;

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days,
    },
    totalRuns: runs.length,
    averageScore,
    scoreTrend,
    passRate,
    gateAverages,
    topIssues: [], // Would need issue details stored per run
  };
}
