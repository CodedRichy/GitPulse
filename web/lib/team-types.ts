/**
 * Team Types - Phase 9.1 Enterprise Readiness
 * Database schema types for multi-tenant team support
 */

// ============================================
// ENUMS
// ============================================

export type TeamTier = 'free' | 'pro' | 'enterprise';
export type TeamStatus = 'active' | 'suspended' | 'cancelled';
export type TeamMemberRole = 'admin' | 'lead' | 'developer' | 'viewer';
export type TeamMemberStatus = 'active' | 'inactive' | 'pending';
export type ApiKeyType = 'personal' | 'team';

// ============================================
// DATABASE TABLES
// ============================================

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  billing_email: string | null;
  tier: TeamTier;
  seats: number;
  seats_used: number;
  features: Record<string, boolean>;
  logo_url: string | null;
  accent_color: string;
  status: TeamStatus;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string;
  status: TeamMemberStatus;
}

export interface TeamSettings {
  team_id: string;
  quality_gate_policies: QualityGatePolicies;
  convention_rules: ConventionRules;
  enforce_policies: boolean;
  allow_override: boolean;
  require_justification: boolean;
  slack_webhook_url: string | null;
  github_org_name: string | null;
  audit_retention_days: number;
  updated_at: string;
}

export interface TeamAuditLog {
  id: string;
  team_id: string;
  user_id: string | null;
  action: TeamAuditAction;
  resource_type: string | null;
  resource_id: string | null;
  repo_name: string | null;
  branch: string | null;
  commit_hash: string | null;
  score: number | null;
  passed: boolean | null;
  total_issues: number | null;
  critical_issues: number | null;
  high_issues: number | null;
  gates: Record<string, any> | null;
  override_reason: string | null;
  override_user_id: string | null;
  details: Record<string, any>;
  client_version: string | null;
  created_at: string;
  retention_until: string;
}

// ============================================
// POLICY & CONFIGURATION TYPES
// ============================================

export interface QualityGatePolicies {
  'security-scan'?: QualityGatePolicy;
  'code-smells'?: QualityGatePolicy;
  'test-coverage'?: QualityGatePolicy;
  'documentation'?: QualityGatePolicy;
  [key: string]: QualityGatePolicy | undefined;
}

export interface QualityGatePolicy {
  enabled: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  block_on_failure: boolean;
  custom_rules?: Record<string, any>;
}

export interface ConventionRules {
  commit_style: 'conventional' | 'semantic' | 'simple' | 'custom';
  enforce_scope: boolean;
  allowed_types?: string[];
  auto_learn: boolean;
  custom_patterns?: Record<string, string>;
}

// ============================================
// AUDIT ACTIONS
// ============================================

export type TeamAuditAction =
  | 'quality_gate_run'
  | 'quality_gate_failed'
  | 'quality_gate_passed'
  | 'commit_protected'
  | 'secret_prevented'
  | 'override_used'
  | 'member_invited'
  | 'member_joined'
  | 'member_removed'
  | 'member_role_changed'
  | 'settings_updated'
  | 'policy_enforced'
  | 'compliance_export_generated';

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateTeamRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateTeamResponse {
  team: Team;
  settings: TeamSettings;
}

export interface InviteMemberRequest {
  email: string;
  role: TeamMemberRole;
}

export interface UpdateMemberRoleRequest {
  role: TeamMemberRole;
}

export interface TeamAnalyticsRequest {
  dateRange: { start: string; end: string };
  repos?: string[];
  members?: string[];
}

export interface TeamAnalyticsResponse {
  period: { start: string; end: string; days: number };
  summary: {
    totalRuns: number;
    averageScore: number;
    passRate: number;
    secretsPrevented: number;
    overridesUsed: number;
  };
  trends: {
    scoreTrend: number; // percentage change
    passRateTrend: number;
    volumeTrend: number;
  };
  byMember: Array<{
    userId: string;
    name: string;
    runs: number;
    averageScore: number;
    secretsPrevented: number;
  }>;
  byRepo: Array<{
    repoName: string;
    runs: number;
    averageScore: number;
    topIssues: string[];
  }>;
  byGate: Record<string, {
    runs: number;
    passRate: number;
    failures: number;
  }>;
}

export interface ComplianceExportRequest {
  format: 'pdf' | 'csv' | 'json';
  dateRange: { start: string; end: string };
  include: ('audit-logs' | 'quality-trends' | 'security-issues')[];
}

// ============================================
// PERMISSIONS & RBAC
// ============================================

export interface PermissionMatrix {
  viewTeam: TeamMemberRole[];
  editTeam: TeamMemberRole[];
  inviteMembers: TeamMemberRole[];
  removeMembers: TeamMemberRole[];
  updateRoles: TeamMemberRole[];
  viewAnalytics: TeamMemberRole[];
  viewAllMemberAnalytics: TeamMemberRole[];
  exportAuditTrail: TeamMemberRole[];
  editSettings: TeamMemberRole[];
  manageBilling: TeamMemberRole[];
  deleteTeam: TeamMemberRole[];
}

export const TEAM_PERMISSIONS: PermissionMatrix = {
  viewTeam: ['admin', 'lead', 'developer', 'viewer'],
  editTeam: ['admin'],
  inviteMembers: ['admin', 'lead'],
  removeMembers: ['admin'],
  updateRoles: ['admin'],
  viewAnalytics: ['admin', 'lead', 'developer'],
  viewAllMemberAnalytics: ['admin', 'lead'],
  exportAuditTrail: ['admin'],
  editSettings: ['admin'],
  manageBilling: ['admin'],
  deleteTeam: ['admin'],
};

export function hasPermission(
  userRole: TeamMemberRole,
  action: keyof PermissionMatrix
): boolean {
  return TEAM_PERMISSIONS[action].includes(userRole);
}

// ============================================
// TIER LIMITS
// ============================================

export interface TierLimits {
  maxSeats: number;
  maxRepos: number | 'unlimited';
  auditRetentionDays: number;
  features: {
    teamDashboard: boolean;
    rbac: boolean;
    auditExport: boolean;
    sso: boolean;
    sla: boolean;
    customRules: boolean;
    webhooks: boolean;
    prioritySupport: boolean;
  };
}

export const TIER_LIMITS: Record<TeamTier, TierLimits> = {
  free: {
    maxSeats: 1,
    maxRepos: 1,
    auditRetentionDays: 30,
    features: {
      teamDashboard: false,
      rbac: false,
      auditExport: false,
      sso: false,
      sla: false,
      customRules: false,
      webhooks: false,
      prioritySupport: false,
    },
  },
  pro: {
    maxSeats: 20,
    maxRepos: 'unlimited',
    auditRetentionDays: 90,
    features: {
      teamDashboard: true,
      rbac: true,
      auditExport: true,
      sso: false,
      sla: false,
      customRules: false,
      webhooks: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    maxSeats: 999999, // unlimited
    maxRepos: 'unlimited',
    auditRetentionDays: 730, // 2 years
    features: {
      teamDashboard: true,
      rbac: true,
      auditExport: true,
      sso: true,
      sla: true,
      customRules: true,
      webhooks: true,
      prioritySupport: true,
    },
  },
};

export function getTierLimits(tier: TeamTier): TierLimits {
  return TIER_LIMITS[tier];
}

// ============================================
// UTILITY TYPES
// ============================================

export interface TeamWithMembers extends Team {
  members: (TeamMember & { user: { email: string; name: string | null } })[];
}

export interface TeamWithSettings extends Team {
  settings: TeamSettings;
}

export interface TeamWithAnalytics extends Team {
  analytics: TeamAnalyticsResponse;
}

export type TeamMemberWithUser = TeamMember & {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
};
