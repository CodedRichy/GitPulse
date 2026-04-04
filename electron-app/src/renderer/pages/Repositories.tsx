import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderGit2, Plus } from 'lucide-react'
import { useRepositories } from '../hooks/useRepositories'
import RepoCard from '../components/features/RepoCard'
import { RepositoryStats } from '../../shared/types'

export default function Repositories() {
  const navigate = useNavigate()
  const { repositories, loading, error } = useRepositories()
  const [showAddDialog, setShowAddDialog] = useState(false)

  const repoList = Object.entries(repositories)

  const handleRepoDetails = (name: string, stats: RepositoryStats) => {
    navigate(`/repository/${encodeURIComponent(name)}`, {
      state: { repoName: name, stats, repoPath: stats.local_path }
    })
  }

  const handleRepoSettings = (name: string, stats: RepositoryStats) => {
    navigate('/automation-rules', {
      state: { repoName: name, stats }
    })
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Repositories</h1>
          <p className="text-muted-foreground mt-1">Manage your watched repositories</p>
        </div>
        <button 
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 neu-button text-primary font-semibold transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          Add Repository
        </button>
      </div>

      {/* Repository List */}
      {error && (
        <div className="neu-section rounded-neu-sm p-3 text-sm text-[rgb(180,83,9)] font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto shadow-glow-primary"></div>
          <p className="text-muted-foreground mt-4">Loading repositories...</p>
        </div>
      ) : repoList.length === 0 ? (
        <div className="text-center py-12 neu-card border border-black/5">
          <FolderGit2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Repositories</h3>
          <p className="text-muted-foreground mb-6">Start monitoring repositories to see them here</p>
          <button 
            onClick={() => setShowAddDialog(true)}
            className="px-6 py-3 neu-button text-primary font-bold transition-all duration-300"
          >
            Add Your First Repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {repoList.map(([name, stats]: [string, any]) => (
            <RepoCard 
              key={name} 
              name={name} 
              stats={stats}
              onDetails={handleRepoDetails}
              onSettings={handleRepoSettings}
            />
          ))}
        </div>
      )}

      {/* Add Repository Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="neu-card-lg p-8 w-96 border border-black/5">
            <h3 className="text-xl font-bold mb-4">Add Repository</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Repository management coming soon. For now, repositories are auto-detected.
            </p>
            <button
              onClick={() => setShowAddDialog(false)}
              className="w-full px-4 py-3 neu-button text-primary font-bold transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
