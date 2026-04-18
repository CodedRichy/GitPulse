import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 30 });

const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

export async function GET(request: NextRequest) {
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

    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members!inner(role, status),
        team_settings(quality_gate_policies, convention_rules)
      `)
      .eq('team_members.user_id', sessionData.userId)
      .eq('team_members.status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch teams:', error);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    const transformedTeams = teams?.map(team => ({
      ...team,
      myRole: team.team_members[0]?.role,
      myStatus: team.team_members[0]?.status,
      team_members: undefined,
    })) || [];

    return NextResponse.json({ teams: transformedTeams });
  } catch (error) {
    console.error('Teams GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tier, email')
      .eq('id', sessionData.userId)
      .single();

    if (userError || !user || user.tier === 'free') {
      return NextResponse.json({ error: 'Free users cannot create teams. Upgrade to Pro.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createTeamSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.flatten() }, { status: 400 });
    }

    const { name, description } = validation.data;
    const slug = generateSlug(name);

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        slug,
        description,
        owner_id: sessionData.userId,
        tier: 'pro',
        seats: 5,
        billing_email: user.email,
      })
      .select()
      .single();

    if (teamError) {
      if (teamError.code === '23505') {
        return NextResponse.json({ error: 'Team slug already exists' }, { status: 409 });
      }
      throw teamError;
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: sessionData.userId,
        role: 'admin',
        status: 'active',
      });

    if (memberError) {
      await supabase.from('teams').delete().eq('id', team.id);
      throw memberError;
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Teams POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
