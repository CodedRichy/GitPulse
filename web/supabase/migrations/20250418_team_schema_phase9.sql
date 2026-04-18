-- Phase 9.1: Team Schema for Enterprise Readiness
-- Timestamp: April 18, 2026
-- Based on: Claude Code Audit - Implementation Plan Phase 9

-- ============================================
-- 1. TEAMS TABLE (Workspace/Organization)
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Ownership & Billing
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  billing_email VARCHAR(255),
  
  -- Tier & Limits
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  seats INTEGER NOT NULL DEFAULT 1,
  seats_used INTEGER NOT NULL DEFAULT 0,
  
  -- Feature Flags (Enterprise)
  features JSONB DEFAULT '{}',
  -- Example: { "sso": true, "audit_export": true, "sla": true }
  
  -- Branding (Enterprise)
  logo_url TEXT,
  accent_color VARCHAR(7) DEFAULT '#10B981',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_tier ON teams(tier);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);

-- ============================================
-- 2. TEAM MEMBERS TABLE (RBAC)
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role-based access control
  role VARCHAR(20) NOT NULL DEFAULT 'developer' 
    CHECK (role IN ('admin', 'lead', 'developer', 'viewer')),
  
  -- Invitation tracking
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'inactive', 'pending')),
  
  -- Unique constraint: one membership per user per team
  UNIQUE(team_id, user_id)
);

-- Indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- ============================================
-- 3. TEAM SETTINGS TABLE (Configuration Override)
-- ============================================
CREATE TABLE IF NOT EXISTS team_settings (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Quality Gate Policies (override user settings)
  quality_gate_policies JSONB DEFAULT '{}',
  -- Example: { "security-scan": { "enabled": true, "severity": "critical", "block_on_failure": true } }
  
  -- Convention Rules (team-wide)
  convention_rules JSONB DEFAULT '{}',
  -- Example: { "commit_style": "conventional", "enforce_scope": true, "allowed_types": ["feat", "fix", "docs"] }
  
  -- Enforcement
  enforce_policies BOOLEAN DEFAULT false,
  allow_override BOOLEAN DEFAULT true,
  require_justification BOOLEAN DEFAULT true,
  
  -- Integrations
  slack_webhook_url TEXT,
  github_org_name VARCHAR(255),
  
  -- Audit & Retention
  audit_retention_days INTEGER DEFAULT 90,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. TEAM AUDIT LOGS TABLE (Centralized)
-- ============================================
CREATE TABLE IF NOT EXISTS team_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Event Details
  action VARCHAR(50) NOT NULL,
  -- Examples: 'quality_gate_run', 'commit_protected', 'secret_prevented', 'override_used', 'member_invited'
  
  resource_type VARCHAR(50),
  resource_id UUID,
  
  -- Quality Gate Results
  repo_name VARCHAR(255),
  branch VARCHAR(255),
  commit_hash VARCHAR(40),
  score INTEGER,
  passed BOOLEAN,
  total_issues INTEGER,
  critical_issues INTEGER,
  high_issues INTEGER,
  gates JSONB, -- Full gate results
  
  -- Override Details (if applicable)
  override_reason TEXT,
  override_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Additional Context
  details JSONB DEFAULT '{}',
  client_version VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retention_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days')
);

-- Indexes for team_audit_logs
CREATE INDEX IF NOT EXISTS idx_team_audit_logs_team_id ON team_audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_team_audit_logs_user_id ON team_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_team_audit_logs_action ON team_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_team_audit_logs_created_at ON team_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_audit_logs_repo_name ON team_audit_logs(repo_name);
CREATE INDEX IF NOT EXISTS idx_team_audit_logs_retention ON team_audit_logs(retention_until) WHERE retention_until < NOW();

-- Composite index for team + date range queries (analytics)
CREATE INDEX IF NOT EXISTS idx_team_audit_logs_team_created 
  ON team_audit_logs(team_id, created_at DESC);

-- ============================================
-- 5. UPDATE EXISTING TABLES FOR TEAM SUPPORT
-- ============================================

-- Add team_id to telemetry_runs (optional, for team-linked runs)
ALTER TABLE telemetry_runs 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add index for team-based telemetry queries
CREATE INDEX IF NOT EXISTS idx_telemetry_runs_team_id ON telemetry_runs(team_id) WHERE team_id IS NOT NULL;

-- Add team_id to api_keys (for team API keys vs personal API keys)
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS key_type VARCHAR(20) DEFAULT 'personal' CHECK (key_type IN ('personal', 'team'));

-- Index for team API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_team_id ON api_keys(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_type ON api_keys(key_type);

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_audit_logs ENABLE ROW LEVEL SECURITY;

-- TEAMS RLS Policies
-- Users can view teams they belong to
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
    OR teams.owner_id = auth.uid()
  );

-- Only owners can update team details
CREATE POLICY "Only owners can update teams"
  ON teams FOR UPDATE
  USING (teams.owner_id = auth.uid());

-- TEAM MEMBERS RLS Policies
-- Members can view other members in their teams
CREATE POLICY "Members can view team members"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS my_membership
      WHERE my_membership.team_id = team_members.team_id
      AND my_membership.user_id = auth.uid()
      AND my_membership.status = 'active'
    )
  );

-- Admins and leads can invite members
CREATE POLICY "Admins and leads can invite members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members AS my_membership
      WHERE my_membership.team_id = team_members.team_id
      AND my_membership.user_id = auth.uid()
      AND my_membership.role IN ('admin', 'lead')
      AND my_membership.status = 'active'
    )
  );

-- Admins can update member roles
CREATE POLICY "Admins can update member roles"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS my_membership
      WHERE my_membership.team_id = team_members.team_id
      AND my_membership.user_id = auth.uid()
      AND my_membership.role = 'admin'
      AND my_membership.status = 'active'
    )
  );

-- Admins can remove members
CREATE POLICY "Admins can remove members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS my_membership
      WHERE my_membership.team_id = team_members.team_id
      AND my_membership.user_id = auth.uid()
      AND my_membership.role = 'admin'
      AND my_membership.status = 'active'
    )
    OR team_members.user_id = auth.uid() -- Users can remove themselves
  );

-- TEAM SETTINGS RLS Policies
-- Team members can view settings
CREATE POLICY "Team members can view settings"
  ON team_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_settings.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- Admins can update settings
CREATE POLICY "Admins can update settings"
  ON team_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_settings.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

-- TEAM AUDIT LOGS RLS Policies
-- Role-based access to audit logs
CREATE POLICY "Role-based audit log access"
  ON team_audit_logs FOR SELECT
  USING (
    -- Admins and leads can see all team logs
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_audit_logs.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'lead')
      AND team_members.status = 'active'
    )
    -- Developers can see their own logs only
    OR team_audit_logs.user_id = auth.uid()
  );

-- Service role can insert audit logs (for CLI sync)
CREATE POLICY "Service role can insert audit logs"
  ON team_audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 7. TRIGGERS AND FUNCTIONS
-- ============================================

-- Update updated_at timestamp for teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp for team_settings
CREATE TRIGGER update_team_settings_updated_at
  BEFORE UPDATE ON team_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update team seats_used count
CREATE OR REPLACE FUNCTION update_team_seats_used()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE teams SET seats_used = seats_used + 1 WHERE id = NEW.team_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE teams SET seats_used = seats_used - 1 WHERE id = OLD.team_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE teams SET seats_used = seats_used + 1 WHERE id = NEW.team_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE teams SET seats_used = seats_used - 1 WHERE id = NEW.team_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep seats_used in sync
CREATE TRIGGER trigger_update_team_seats_used
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_seats_used();

-- Function to enforce seat limits
CREATE OR REPLACE FUNCTION check_seat_limit()
RETURNS TRIGGER AS $$
DECLARE
  max_seats INTEGER;
  current_seats INTEGER;
BEGIN
  SELECT seats, seats_used INTO max_seats, current_seats
  FROM teams WHERE id = NEW.team_id;
  
  IF current_seats >= max_seats THEN
    RAISE EXCEPTION 'Team has reached maximum seat limit (%)', max_seats;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check seat limits before insert
CREATE TRIGGER trigger_check_seat_limit
  BEFORE INSERT ON team_members
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION check_seat_limit();

-- ============================================
-- 8. SEED DATA (Optional)
-- ============================================

-- Create default team_settings when a team is created
CREATE OR REPLACE FUNCTION create_default_team_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_settings (team_id, quality_gate_policies, convention_rules)
  VALUES (
    NEW.id,
    '{
      "security-scan": { "enabled": true, "severity": "critical", "block_on_failure": true },
      "code-smells": { "enabled": true, "severity": "high", "block_on_failure": false },
      "test-coverage": { "enabled": true, "severity": "medium", "block_on_failure": false },
      "documentation": { "enabled": false, "severity": "low", "block_on_failure": false }
    }'::jsonb,
    '{
      "commit_style": "conventional",
      "enforce_scope": false,
      "auto_learn": true
    }'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_team_settings
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_default_team_settings();

-- ============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE teams IS 'Teams/Organizations workspace for multi-tenant support';
COMMENT ON TABLE team_members IS 'Team membership with RBAC (admin, lead, developer, viewer)';
COMMENT ON TABLE team_settings IS 'Team-level configuration overrides';
COMMENT ON TABLE team_audit_logs IS 'Centralized audit logs for team-wide visibility';

COMMENT ON COLUMN teams.tier IS 'Subscription tier: free, pro, or enterprise';
COMMENT ON COLUMN teams.seats IS 'Maximum allowed team members';
COMMENT ON COLUMN team_members.role IS 'RBAC role: admin (full), lead (manage), developer (use), viewer (read-only)';
COMMENT ON COLUMN api_keys.team_id IS 'NULL for personal keys, set for team API keys';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
