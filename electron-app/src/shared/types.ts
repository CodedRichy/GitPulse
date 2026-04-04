export interface AnalyticsData {
  total_commits: number
  ai_commits: number
  ai_percentage: number
  repos_tracked: number
  total_pushes: number
  failed_pushes: number
  success_rate: number
  days_active: number
  avg_commits_per_day: number
}

export interface RepositoryStats {
  commits: number
  pushes: number
  errors: number
  last_commit?: string
  last_push?: string
  last_activity?: string
  status?: 'idle' | 'watching' | 'committing'
  risk_level?: 'low' | 'medium' | 'high'
  confidence?: number
  local_path?: string
}

export interface ConfigData {
  ai_provider: 'ollama' | 'openai' | 'anthropic'
  ollama_model?: string
  debounce_seconds: number
  enable_analytics: boolean
  enable_notifications: boolean
  user_tier: 'free' | 'pro' | 'team' | 'enterprise'
  feature_limits: {
    max_repos: number
    ai_commits_per_month: number
    cloud_providers: boolean
    analytics: boolean
    team_features: boolean
    priority_support: boolean
  }
}

export interface GitHubUser {
  login: string
  name?: string
  avatar_url?: string
  public_repos?: number
  created_at?: string
}

export interface PythonLog {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  source: string
}

export interface AIProviderStats {
  provider: string
  requests: number
  successes: number
  failures: number
  avg_response_time?: number
}

export interface ErrorStats {
  type: string
  count: number
  last_occurred?: string
}

export interface PipelineEvent {
  id: string
  timestamp: string
  step: 'change_detected' | 'debounce_closed' | 'ai_analyzed' | 'commit_generated' | 'push_queued' | 'push_completed' | 'push_failed' | 'risk_exceeded' | 'commit_approved' | 'commit_rejected'
  status: 'pending' | 'done' | 'failed'
  repo_name?: string
  message?: string
  risk_level?: 'low' | 'medium' | 'high'
  confidence?: number
}

export interface NotificationEvent {
  id: string
  timestamp: string
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
  repo_name?: string
  read: boolean
}
