import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const updateSettingsSchema = z.object({
  quality_gate_policies: z.record(z.string(), z.any()).optional(),
  convention_rules: z.record(z.string(), z.any()).optional(),
  notification_settings: z.record(z.string(), z.any()).optional(),
  webhook_url: z.string().url().optional().nullable(),
  auto_sync_repos: z.boolean().optional(),
  enforce_quality_gates: z.boolean().optional(),
});

// GET /api/teams/[id]/settings - Get team settings
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

    // Check membership (any role can view settings)
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

    const { data: settings, error } = await supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (error || !settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/teams/[id]/settings - Update team settings (admin only)
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

    // Check admin role
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', sessionData.userId)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update settings' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.flatten() }, { status: 400 });
    }

    const { data: settings, error } = await supabase
      .from('team_settings')
      .update(validation.data)
      .eq('team_id', teamId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
