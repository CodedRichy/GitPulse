-- Create user_configs table for storing GitPulse configuration per user
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_configs_updated_at
  BEFORE UPDATE ON user_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own config
CREATE POLICY "Users can view own config"
  ON user_configs FOR SELECT
  USING (auth.uid()::text = (SELECT id FROM users WHERE users.id = user_configs.user_id LIMIT 1));

-- Create policy: Users can insert their own config
CREATE POLICY "Users can insert own config"
  ON user_configs FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT id FROM users WHERE users.id = user_configs.user_id LIMIT 1));

-- Create policy: Users can update their own config
CREATE POLICY "Users can update own config"
  ON user_configs FOR UPDATE
  USING (auth.uid()::text = (SELECT id FROM users WHERE users.id = user_configs.user_id LIMIT 1));
