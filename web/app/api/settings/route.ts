import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { validateEmail, validateUUID } from '@/lib/validation';
import { logSettingsUpdated } from '@/lib/audit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/settings
 * Returns user settings.
 */
export async function GET(request: NextRequest) {
  try {
    const session = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = JSON.parse(session);
    const { data: user, error } = await supabase
      .from('users')
      .select('email, github_login, name, avatar_url, tier')
      .eq('id', userData.user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      email: user.email,
      github_login: user.github_login,
      name: user.name,
      avatar_url: user.avatar_url,
      tier: user.tier,
    });
  } catch (error) {
    console.error('Settings API error:', error);
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
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!validateUUID(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!validateEmail(email)) {
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

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      user: data,
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
