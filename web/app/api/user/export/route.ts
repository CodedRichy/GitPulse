import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limit: 3 exports per hour per user
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 });

/**
 * GET /api/user/export
 * Export all user data (GDPR compliance)
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = limiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Export rate limit exceeded. Please try again later.' },
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

    // Fetch all user data
    const [
      { data: user },
      { data: apiKeys },
      { data: configs },
      { data: telemetryRuns },
      { data: supportTickets },
      { data: auditLogs },
    ] = await Promise.all([
      // User profile
      supabase
        .from('users')
        .select('id, github_id, github_login, name, email, avatar_url, tier, created_at, updated_at')
        .eq('id', userId)
        .single(),
      
      // API keys (only non-sensitive fields)
      supabase
        .from('api_keys')
        .select('id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at')
        .eq('user_id', userId),
      
      // User configs
      supabase
        .from('user_configs')
        .select('config, created_at, updated_at')
        .eq('user_id', userId)
        .single(),
      
      // Telemetry runs (last 90 days)
      supabase
        .from('telemetry_runs')
        .select('timestamp, repo_name, branch, score, passed, total_issues, client_version')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false }),
      
      // Support tickets
      supabase
        .from('support_tickets')
        .select('subject, message, status, priority, created_at, resolved_at')
        .eq('user_id', userId),
      
      // Audit logs (last 180 days)
      supabase
        .from('audit_logs')
        .select('action, resource_type, details, timestamp, ip_address')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false }),
    ]);

    // Compile export data
    const exportData = {
      export_metadata: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        version: '1.0',
      },
      profile: user || null,
      api_keys: apiKeys || [],
      configs: configs || null,
      telemetry_runs: telemetryRuns || [],
      support_tickets: supportTickets || [],
      audit_logs: auditLogs || [],
    };

    // Log the export
    await logAudit({
      user_id: userId,
      action: 'user.data_export',
      resource_type: 'user_data',
      details: { 
        sections_exported: Object.keys(exportData).filter(k => k !== 'export_metadata'),
        record_counts: {
          api_keys: exportData.api_keys.length,
          telemetry_runs: exportData.telemetry_runs.length,
          support_tickets: exportData.support_tickets.length,
          audit_logs: exportData.audit_logs.length,
        }
      },
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || undefined,
      success: true,
    });

    // Return as JSON download
    const response = NextResponse.json(exportData, { status: 200 });
    response.headers.set('Content-Disposition', `attachment; filename="gitpulse-data-export-${userId}.json"`);
    return response;

  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
