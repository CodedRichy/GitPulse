import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 30 });

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'lead', 'developer', 'viewer']),
});

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'lead', 'developer', 'viewer']),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data: myMembership, error: myError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', sessionData.userId)
      .eq('status', 'active')
      .single();

    if (myError || !myMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        status,
        invited_at,
        joined_at,
        user:user_id(id, email, name, avatar_url)
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ members: members || [], myRole: myMembership.role });
  } catch (error) {
    console.error('Members GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data: myMembership, error: myError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', sessionData.userId)
      .eq('status', 'active')
      .single();

    if (myError || !myMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['admin', 'lead'].includes(myMembership.role)) {
      return NextResponse.json({ error: 'Only admins and leads can invite members' }, { status: 403 });
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('seats, seats_used')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.seats_used >= team.seats) {
      return NextResponse.json({ error: 'Team has reached maximum seat limit' }, { status: 403 });
    }

    const body = await request.json();
    const validation = inviteSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.flatten() }, { status: 400 });
    }

    const { email, role } = validation.data;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 });
    }

    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({ error: 'User is already a team member' }, { status: 409 });
      }
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ status: 'active', role, invited_by: sessionData.userId, invited_at: new Date().toISOString() })
        .eq('id', existingMember.id);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, message: 'Member reactivated' });
    }

    const { error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: user.id,
        role,
        status: 'active',
        invited_by: sessionData.userId,
        invited_at: new Date().toISOString(),
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, message: 'Invitation sent' }, { status: 201 });
  } catch (error) {
    console.error('Members POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const { data: myMembership, error: myError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', sessionData.userId)
      .eq('status', 'active')
      .single();

    if (myError || !myMembership || myMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update roles' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { error } = await supabase
      .from('team_members')
      .update({ role: validation.data.role })
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Members PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { data: myMembership, error: myError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', sessionData.userId)
      .eq('status', 'active')
      .single();

    if (myError || !myMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const isAdmin = myMembership.role === 'admin';
    const isSelf = targetMember.user_id === sessionData.userId;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Can only remove yourself or be an admin' }, { status: 403 });
    }

    const { error } = await supabase
      .from('team_members')
      .update({ status: 'inactive' })
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Members DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
