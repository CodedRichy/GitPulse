-- Data Retention Policy Migration
-- Adds retention tracking columns and cleanup policies

-- Add retention metadata to telemetry_runs
ALTER TABLE telemetry_runs 
ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP WITH TIME ZONE 
  DEFAULT (NOW() + INTERVAL '90 days');

-- Add index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_telemetry_runs_retention 
ON telemetry_runs(retention_until) 
WHERE retention_until < NOW();

-- Add retention to support_tickets (keep for 1 year after resolution)
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP WITH TIME ZONE;

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_support_tickets_retention 
ON support_tickets(resolved_at, retention_until) 
WHERE resolved_at IS NOT NULL AND retention_until < NOW();

-- Add retention to audit_logs (180 days)
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP WITH TIME ZONE 
  DEFAULT (NOW() + INTERVAL '180 days');

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention 
ON audit_logs(retention_until) 
WHERE retention_until < NOW();

-- Function to set retention date when ticket is resolved
CREATE OR REPLACE FUNCTION set_ticket_retention_on_resolve()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
    NEW.resolved_at = NOW();
    NEW.retention_until = NOW() + INTERVAL '365 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for support ticket retention
DROP TRIGGER IF EXISTS trigger_set_ticket_retention ON support_tickets;
CREATE TRIGGER trigger_set_ticket_retention
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_retention_on_resolve();

-- Create cleanup function (to be called by scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE (table_name TEXT, deleted_count INTEGER) AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Cleanup telemetry_runs older than 90 days
  DELETE FROM telemetry_runs 
  WHERE retention_until < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN QUERY SELECT 'telemetry_runs'::TEXT, deleted_count;
  
  -- Cleanup resolved support tickets older than 365 days
  DELETE FROM support_tickets 
  WHERE resolved_at IS NOT NULL 
    AND retention_until < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN QUERY SELECT 'support_tickets'::TEXT, deleted_count;
  
  -- Cleanup audit logs older than 180 days
  DELETE FROM audit_logs 
  WHERE retention_until < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN QUERY SELECT 'audit_logs'::TEXT, deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
