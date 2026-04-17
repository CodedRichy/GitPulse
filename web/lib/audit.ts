import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Audit action types
 */
export type AuditAction = 
  | 'api_key.create'
  | 'api_key.revoke'
  | 'config.update'
  | 'settings.update'
  | 'support_ticket.create'
  | 'user.login'
  | 'user.logout'
  | 'user.data_export'
  | 'user.account_deletion';

/**
 * Audit log entry structure
 */
interface AuditLogEntry {
  user_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  success?: boolean;
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        details: entry.details || {},
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        success: entry.success ?? true,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to write audit log:', error);
    }
  } catch (err) {
    // Don't throw - audit logging should not break main functionality
    console.error('Audit logging error:', err);
  }
}

/**
 * Extract client info from request
 */
export function getClientInfo(request: NextRequest): { ip?: string; userAgent?: string } {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             undefined;
  
  const userAgent = request.headers.get('user-agent') || undefined;
  
  return { ip, userAgent };
}

/**
 * Log API key creation
 */
export async function logApiKeyCreated(
  request: NextRequest,
  userId: string,
  keyId: string,
  keyName: string
): Promise<void> {
  const { ip, userAgent } = getClientInfo(request);
  
  await logAudit({
    user_id: userId,
    action: 'api_key.create',
    resource_type: 'api_key',
    resource_id: keyId,
    details: { key_name: keyName },
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}

/**
 * Log API key revocation
 */
export async function logApiKeyRevoked(
  request: NextRequest,
  userId: string,
  keyId: string,
  keyName?: string
): Promise<void> {
  const { ip, userAgent } = getClientInfo(request);
  
  await logAudit({
    user_id: userId,
    action: 'api_key.revoke',
    resource_type: 'api_key',
    resource_id: keyId,
    details: { key_name: keyName },
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}

/**
 * Log config update
 */
export async function logConfigUpdated(
  request: NextRequest,
  userId: string,
  changes: Record<string, any>
): Promise<void> {
  const { ip, userAgent } = getClientInfo(request);
  
  await logAudit({
    user_id: userId,
    action: 'config.update',
    resource_type: 'user_config',
    details: { changes },
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}

/**
 * Log settings update
 */
export async function logSettingsUpdated(
  request: NextRequest,
  userId: string,
  changes: Record<string, any>
): Promise<void> {
  const { ip, userAgent } = getClientInfo(request);
  
  await logAudit({
    user_id: userId,
    action: 'settings.update',
    resource_type: 'user_settings',
    details: { changes },
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}

/**
 * Log support ticket creation
 */
export async function logSupportTicketCreated(
  request: NextRequest,
  userId: string | null,
  ticketId: string,
  subject: string
): Promise<void> {
  const { ip, userAgent } = getClientInfo(request);
  
  await logAudit({
    user_id: userId || undefined,
    action: 'support_ticket.create',
    resource_type: 'support_ticket',
    resource_id: ticketId,
    details: { subject },
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}

/**
 * Log user login
 */
export async function logUserLogin(
  request: NextRequest,
  userId: string,
  method: 'github' | 'email'
): Promise<void> {
  const { ip, userAgent } = getClientInfo(request);
  
  await logAudit({
    user_id: userId,
    action: 'user.login',
    resource_type: 'user_session',
    details: { method },
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}

/**
 * Log user logout
 */
export async function logUserLogout(
  request: NextRequest,
  userId: string
): Promise<void> {
  const { ip, userAgent } = getClientInfo(request);
  
  await logAudit({
    user_id: userId,
    action: 'user.logout',
    resource_type: 'user_session',
    details: {},
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}
