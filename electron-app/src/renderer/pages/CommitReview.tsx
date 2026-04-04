import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Pencil, XCircle, Loader2, GitCommit, GitPullRequest, Trash2, FileDiff } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function CommitReview() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { 
    repoName?: string; 
    repoPath?: string;
    risk?: 'low' | 'medium' | 'high'; 
    confidence?: number;
    diff?: string;
    commitMessage?: string;
  } | null
  
  const repoName = state?.repoName || 'selected repository'
  const repoPath = state?.repoPath || ''
  const risk = state?.risk || 'medium'
  const confidence = state?.confidence ?? 80
  const diff = state?.diff || ''
  const initialMessage = state?.commitMessage || 'feat: update files'

  const [commitMessage, setCommitMessage] = useState(initialMessage)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'idle' | 'committing' | 'pushing' | 'discarding'>('idle')
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleCommit = async () => {
    if (!repoPath) return
    
    setLoading(true)
    setAction('committing')
    setResult(null)
    
    try {
      const response = await window.electronAPI?.commitChanges({ repoPath, message: commitMessage })
      if (response?.error) {
        setResult({ type: 'error', message: response.error })
      } else {
        setResult({ type: 'success', message: 'Changes committed successfully' })
      }
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Failed to commit' })
    } finally {
      setLoading(false)
      setAction('idle')
    }
  }

  const handleCommitAndPush = async () => {
    if (!repoPath) return
    
    setLoading(true)
    setAction('committing')
    setResult(null)
    
    try {
      const commitResponse = await window.electronAPI?.commitChanges({ repoPath, message: commitMessage })
      if (commitResponse?.error) {
        setResult({ type: 'error', message: commitResponse.error })
        setLoading(false)
        setAction('idle')
        return
      }
      
      setAction('pushing')
      const pushResponse = await window.electronAPI?.pushChanges(repoPath)
      if (pushResponse?.error) {
        setResult({ type: 'error', message: 'Committed but push failed: ' + pushResponse.error })
      } else {
        setResult({ type: 'success', message: 'Changes committed and pushed successfully' })
      }
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Failed to commit and push' })
    } finally {
      setLoading(false)
      setAction('idle')
    }
  }

  const handleDiscard = async () => {
    if (!repoPath) return
    
    if (!confirm('Are you sure you want to discard all changes? This cannot be undone.')) {
      return
    }
    
    setLoading(true)
    setAction('discarding')
    setResult(null)
    
    try {
      const response = await window.electronAPI?.discardChanges(repoPath)
      if (response?.error) {
        setResult({ type: 'error', message: response.error })
      } else {
        setResult({ type: 'success', message: 'Changes discarded' })
        setTimeout(() => navigate('/repositories'), 1500)
      }
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Failed to discard changes' })
    } finally {
      setLoading(false)
      setAction('idle')
    }
  }

  const formatDiff = (diffText: string) => {
    return diffText.split('\n').slice(0, 50).map((line, i) => {
      let colorClass = 'text-foreground'
      if (line.startsWith('+')) colorClass = 'text-green-600'
      if (line.startsWith('-')) colorClass = 'text-red-600'
      if (line.startsWith('@@')) colorClass = 'text-blue-600'
      if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
        colorClass = 'text-muted-foreground text-xs'
      }
      return (
        <div key={i} className={`${colorClass} font-mono text-xs whitespace-pre-wrap break-all`}>
          {line || ' '}
        </div>
      )
    })
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Commit Review</h1>
        <p className="text-muted-foreground mt-1">Review {risk} risk commit for {repoName} before write/push.</p>
      </div>

      {result && (
        <div className={`neu-card p-4 flex items-center gap-3 ${result.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {result.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <p>{result.message}</p>
        </div>
      )}

      <div className="neu-card p-6 space-y-4">
        <div className={`flex items-center gap-2 font-semibold ${
          risk === 'high' ? 'text-red-600' : risk === 'medium' ? 'text-amber-600' : 'text-green-600'
        }`}>
          <AlertTriangle className="w-5 h-5" /> 
          {risk.toUpperCase()} Risk Change Detected
        </div>
        <div className="neu-section p-4 rounded-neu-sm text-sm text-foreground">
          AI analyzed changes in {repoName}. Confidence score: {confidence}%. Review the diff below before approving.
        </div>
      </div>

      {diff && (
        <div className="neu-card p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileDiff className="w-4 h-4" />
            Diff Preview ({diff.split('\n').length} lines)
          </h3>
          <div className="neu-section rounded-neu-sm p-4 overflow-auto max-h-96">
            {formatDiff(diff)}
            {diff.split('\n').length > 50 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">... diff truncated for preview</p>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="neu-card p-6">
          <h3 className="font-semibold mb-3">Commit Message</h3>
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full p-3 rounded-neu-sm neu-section text-sm"
                placeholder="Enter commit message..."
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs neu-button rounded-neu-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="neu-section rounded-neu-sm p-3 text-sm text-foreground flex-1">{commitMessage}</p>
              <button 
                onClick={() => setIsEditing(true)}
                className="ml-2 p-2 neu-button rounded-neu-sm"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="neu-card p-6">
          <h3 className="font-semibold mb-3">Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={handleCommit}
              disabled={loading}
              className="w-full neu-button px-4 py-2 rounded-neu-sm text-primary font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {action === 'committing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCommit className="w-4 h-4" />}
              Commit Only
            </button>
            <button 
              onClick={handleCommitAndPush}
              disabled={loading}
              className="w-full neu-button px-4 py-2 rounded-neu-sm text-success font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {action === 'pushing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />}
              Commit & Push
            </button>
            <button 
              onClick={handleDiscard}
              disabled={loading}
              className="w-full neu-button px-4 py-2 rounded-neu-sm text-destructive font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {action === 'discarding' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Discard Changes
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => navigate('/timeline')} 
          className="neu-button px-4 py-2 rounded-neu-sm text-foreground font-semibold"
        >
          View Activity Timeline
        </button>
        <button 
          onClick={() => navigate('/repositories')} 
          className="neu-button px-4 py-2 rounded-neu-sm text-foreground font-semibold"
        >
          Back to Repositories
        </button>
      </div>
    </div>
  )
}
