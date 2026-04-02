import { User, Github, LogOut, Crown, Shield } from 'lucide-react'
import { useGitHub } from '../hooks/useGitHub'

export default function Account() {
  const { user, loading, error, connecting, deviceAuth, connectWithGitHub, clearGitHubToken, clearError, isAuthenticated } = useGitHub()

  const handleLogout = async () => {
    await clearGitHubToken()
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account</h1>
        <p className="text-muted-foreground mt-1">Manage your GitHub integration and subscription</p>
      </div>

      {/* GitHub Connection */}
      <div className="neu-card p-6 border border-black/5">
        <div className="flex items-center gap-2 mb-4">
          <Github className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">GitHub Integration</h2>
        </div>

        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-success/5 border border-success/10 rounded-neu-sm shadow-neu-sm">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center shadow-neu-sm">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-success" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{user?.name || user?.login || 'GitHub User'}</p>
                <p className="text-sm text-muted-foreground">
                  @{user?.login} • {user?.public_repos || 0} public repos
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 neu-button text-destructive font-semibold transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 neu-section rounded-neu-sm shadow-neu-sm">
                <p className="text-sm text-muted-foreground mb-1">Repositories</p>
                <p className="text-2xl font-bold text-foreground">{user?.public_repos || 21}</p>
              </div>
              <div className="p-4 neu-section rounded-neu-sm shadow-neu-sm">
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="text-lg font-semibold text-foreground">
                  {user?.created_at ? new Date(user.created_at).getFullYear() : 2024}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Github className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Connect Your GitHub Account</h3>
              <p className="text-muted-foreground mb-6">
                Link your GitHub account to sync repositories and access advanced features
              </p>
            </div>

            <div className="space-y-3">
              {deviceAuth && (
                <div className="p-4 rounded-neu-sm border border-primary/20 bg-primary/5 shadow-neu-sm text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Use this code on GitHub</p>
                  <p className="text-2xl font-bold tracking-[0.2em] text-primary">{deviceAuth.userCode}</p>
                  <p className="text-xs text-muted-foreground">
                    If your browser did not open, visit{' '}
                    <a
                      href={deviceAuth.verificationUri}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {deviceAuth.verificationUri}
                    </a>
                  </p>
                </div>
              )}

              {error && (
                <p className="mt-2 text-xs text-destructive font-medium">{error}</p>
              )}

              <button
                onClick={async () => {
                  if (error) {
                    clearError()
                  }
                  await connectWithGitHub()
                }}
                disabled={connecting}
                className="w-full px-4 py-3 rounded-neu-sm bg-primary text-primary-foreground font-bold transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? 'Waiting for GitHub authorization...' : 'Continue with GitHub'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Info */}
      <div className="bg-primary/5 border border-primary/10 rounded-neu-lg p-6 shadow-neu-sm">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Subscription</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
            <p className="text-3xl font-bold text-primary">FREE Tier</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 neu-section rounded-neu-sm shadow-neu-sm">
              <p className="text-sm text-muted-foreground mb-1">Max Repositories</p>
              <p className="text-2xl font-bold text-foreground">1</p>
            </div>
            <div className="p-4 neu-section rounded-neu-sm shadow-neu-sm">
              <p className="text-sm text-muted-foreground mb-1">AI Commits/Month</p>
              <p className="text-2xl font-bold text-foreground">100</p>
            </div>
          </div>

          <div className="border-t border-black/5 pt-4">
            <h3 className="font-semibold mb-3">Upgrade to Pro</h3>
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-success" />
                Unlimited repositories
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-success" />
                Unlimited AI commits
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-success" />
                All AI providers (OpenAI, Claude)
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-success" />
                Priority support
              </li>
            </ul>
            <button className="w-full px-6 py-3 neu-button text-primary font-bold transition-all duration-300">
              Upgrade to Pro - $9/month
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-destructive/5 border border-destructive/10 rounded-neu-lg p-6">
        <h2 className="text-xl font-semibold text-destructive mb-4">Danger Zone</h2>
        <div className="space-y-3">
          <button className="w-full px-4 py-2 rounded-neu-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 text-left">
            Clear All Analytics Data
          </button>
          <button className="w-full px-4 py-2 rounded-neu-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 text-left">
            Reset All Settings
          </button>
          <button className="w-full px-4 py-2 rounded-neu-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 text-left">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
