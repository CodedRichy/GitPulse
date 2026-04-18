import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limit: 1 deletion attempt per hour per user
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 1 });

/**
 * POST /api/user/delete
 * Delete user account and all associated data (GDPR Right to be Forgotten)
 * Requires confirmation code (password/verification)
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many deletion attempts. Please try again later.' },
      { status: 429 }
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

    const userId = sessionData.userId;

    // Get request body for confirmation
    const body = await request.json().catch(() => ({}));
    const { confirmDelete, password } = body;

    // Security: Require both boolean confirmation AND password verification
    if (!confirmDelete || confirmDelete !== true) {
      return NextResponse.json(
        { 
          error: 'Confirmation required',
          message: 'Set confirmDelete: true to confirm account deletion. This action cannot be undone.',
          data_to_be_deleted: [
            'User profile and GitHub connection',
            'All API keys',
            'User configuration',
            'All telemetry runs',
            'All support tickets',
            'All audit logs',
          ],
          retention_note: 'Some data may be retained for legal compliance (e.g., billing records)',
        },
        { status: 400 }
      );
    }

    // Security: Require password/email verification for account deletion
    // This prevents CSRF attacks from deleting accounts
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { 
          error: 'Password verification required',
          message: 'For security, please provide your current password to confirm account deletion.',
          requires_password: true,
        },
        { status: 403 }
      );
    }

    // TODO: Verify password against stored hash (implement based on your auth system)
    // For now, require a specific confirmation phrase as a placeholder
    const expectedPhrase = `DELETE MY ACCOUNT ${userId}`;
    if (password !== expectedPhrase) {
      // In production, replace this with actual password verification
      // const isValidPassword = await verifyPassword(userId, password);
      // if (!isValidPassword) { ... }
      
      return NextResponse.json(
        { 
          error: 'Invalid verification',
          message: 'Password verification failed. Please provide the exact confirmation phrase sent to your email.',
        },
        { status: 403 }
      );
    }

    // Log the deletion attempt before actual deletion
    await logAudit({
      user_id: userId,
      action: 'user.account_deletion',
      resource_type: 'user_account',
      details: { 
        initiated_at: new Date().toISOString(),
        ip_address: ip,
      },
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || undefined,
      success: true,
    });

    // Delete all user data in proper order (respecting foreign keys)
    const deletionResults = [];

    // 1. Delete audit logs (no foreign key constraints)
    const { error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .eq('user_id', userId);
    deletionResults.push({ table: 'audit_logs', error: auditError?.message || null });

    // 2. Delete API keys
    const { error: keysError } = await supabase
      .from('api_keys')
      .delete()
      .eq('user_id', userId);
    deletionResults.push({ table: 'api_keys', error: keysError?.message || null });

    // 3. Delete user configs
    const { error: configError } = await supabase
      .from('user_configs')
      .delete()
      .eq('user_id', userId);
    deletionResults.push({ table: 'user_configs', error: configError?.message || null });

    // 4. Delete telemetry runs
    const { error: telemetryError } = await supabase
      .from('telemetry_runs')
      .delete()
      .eq('user_id', userId);
    deletionResults.push({ table: 'telemetry_runs', error: telemetryError?.message || null });

    // 5. Delete support tickets
    const { error: ticketsError } = await supabase
      .from('support_tickets')
      .delete()
      .eq('user_id', userId);
    deletionResults.push({ table: 'support_tickets', error: ticketsError?.message || null });

    // 6. Finally, delete the user
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    deletionResults.push({ table: 'users', error: userError?.message || null });

    // Check for any errors
    const errors = deletionResults.filter(r => r.error);
    
    if (errors.length > 0) {
      console.error('Account deletion errors:', errors);
      return NextResponse.json(
        { 
          error: 'Partial deletion failure',
          details: errors,
          message: 'Some data could not be deleted. Please contact support.',
        },
        { status: 500 }
      );
    }

    // Clear session cookies
    const response = NextResponse.json({
      success: true,
      message: 'Account and all associated data have been deleted.',
      deletion_summary: {
        user_id: userId,
        deleted_at: new Date().toISOString(),
        tables_affected: deletionResults.map(r => r.table),
      },
    });

    // Clear auth cookies with strict security settings
    response.cookies.set('gitpulse_auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Security: Changed from 'lax' to 'strict'
      maxAge: 0,
      path: '/',
    });
    response.cookies.set('csrf_token', '', {
      httpOnly: true, // Security: Changed from false to true
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
