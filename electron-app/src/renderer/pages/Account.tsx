import { useState } from 'react'
import { User, Github, LogOut, Crown, Shield } from 'lucide-react'
import { useGitHub } from '../hooks/useGitHub'

export default function Account() {
  const { token, user, loading, setGitHubToken, clearGitHubToken, isAuthenticated } = useGitHub()
  const [tokenInput, setTokenInput] = useState('')

  const handleSetToken = async () => {
    if (tokenInput) {
      await setGitHubToken(tokenInput)
      setTokenInput('')
    }
  }

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
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Github className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">GitHub Integration</h2>
        </div>

        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-green-500" />
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
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Repositories</p>
                <p className="text-2xl font-bold">{user?.public_repos || 21}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="text-lg font-semibold">
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
              <div>
                <label className="block text-sm font-medium mb-2">GitHub Personal Access Token</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Create a token at{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/settings/tokens
                  </a>
                </p>
              </div>
              <button
                onClick={handleSetToken}
                disabled={!tokenInput}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect GitHub
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Info */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-primary/20 rounded-lg p-6">
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
            <div className="p-4 bg-background/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Max Repositories</p>
              <p className="text-2xl font-bold">1</p>
            </div>
            <div className="p-4 bg-background/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">AI Commits/Month</p>
              <p className="text-2xl font-bold">100</p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-3">Upgrade to Pro</h3>
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-500" />
                Unlimited repositories
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-500" />
                Unlimited AI commits
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-500" />
                All AI providers (OpenAI, Claude)
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-500" />
                Priority support
              </li>
            </ul>
            <button className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold">
              Upgrade to Pro - $9/month
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-500 mb-4">Danger Zone</h2>
        <div className="space-y-3">
          <button className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-left">
            Clear All Analytics Data
          </button>
          <button className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-left">
            Reset All Settings
          </button>
          <button className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-left">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
