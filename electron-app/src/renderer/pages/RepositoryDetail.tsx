import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FileDiff, ShieldAlert, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { RepositoryStats } from '../../shared/types'
import { useGitOperations } from '../hooks/useGitOperations'

export default function RepositoryDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { name } = useParams()
  const state = location.state as { repoName?: string; stats?: RepositoryStats; repoPath?: string } | null
  const repoName = useMemo(() => decodeURIComponent(name || ''), [name])
  const repoPath = state?.repoPath || ''
  const stats = state?.stats

  const { loading, error, getGitDiff, getGitStatus, generateCommitMessage } = useGitOperations()
  const [diff, setDiff] = useState('')
  const [files, setFiles] = useState<Array<{ status: string; file: string }>>([])
  const [commitMessage, setCommitMessage] = useState('')
  const [generatedRisk, setGeneratedRisk] = useState<'low' | 'medium' | 'high'>('low')
  const [generatedConfidence, setGeneratedConfidence] = useState(75)

  useEffect(() => {
    if (repoPath) {
      loadGitData()
    }
  }, [repoPath])

  const loadGitData = async () => {
    const [diffResult, statusResult] = await Promise.all([
      getGitDiff(repoPath),
      getGitStatus(repoPath),
    ])

    if (diffResult.success) {
      setDiff(diffResult.diff || '')
    }

    if (statusResult.success) {
      setFiles(statusResult.files || [])
    }

    if (diffResult.diff && diffResult.diff.trim()) {
      const result = await generateCommitMessage(repoPath, diffResult.diff)
      if (result.success) {
        setCommitMessage(result.message)
        setGeneratedRisk(result.risk || 'low')
        setGeneratedConfidence(result.confidence || 75)
      }
    }
  }

  const handleOpenReview = () => {
    navigate('/commit-review', {
      state: {
        repoName,
        risk: generatedRisk,
        confidence: generatedConfidence,
        diff,
        commitMessage,
      },
    })
  }

  const formatDiff = (diffText: string) => {
    return diffText.split('\n').slice(0, 20).map((line, i) => {
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

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Repository Detail</h1>
          <p className="text-muted-foreground mt-1">{repoName || 'Unknown repository'}</p>
        </div>
        <div className="neu-card p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Repository Detail</h1>
          <p className="text-muted-foreground mt-1">{repoName || 'Unknown repository'}</p>
        </div>
        <div className="neu-card p-6 flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Repository Detail</h1>
        <p className="text-muted-foreground mt-1">{repoName || 'Unknown repository'}</p>
        {repoPath && <p className="text-xs text-muted-foreground mt-1">{repoPath}</p>}
      </div>

      {files.length > 0 && (
        <div className="neu-card p-4">
          <h3 className="font-semibold mb-2 text-sm">Changed Files ({files.length})</h3>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="neu-section px-2 py-1 rounded-neu-sm text-xs">
                <span className="text-muted-foreground mr-1">[{f.status}]</span>
                {f.file}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="neu-card p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileDiff className="w-5 h-5 text-primary" /> 
          Diff Preview
          {diff && <span className="text-xs text-muted-foreground font-normal">({diff.split('\n').length} lines)</span>}
        </h2>
        {diff ? (
          <div className="neu-section rounded-neu-sm p-4 overflow-auto max-h-80">
            {formatDiff(diff)}
            {diff.split('\n').length > 20 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">... truncated for preview</p>
            )}
          </div>
        ) : (
          <div className="neu-section rounded-neu-sm p-8 text-center text-muted-foreground">
            No uncommitted changes
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="neu-card p-6">
          <h3 className="font-semibold mb-2">AI Commit Message</h3>
          {commitMessage ? (
            <p className="neu-section rounded-neu-sm p-3 text-sm text-foreground">{commitMessage}</p>
          ) : (
            <p className="neu-section rounded-neu-sm p-3 text-sm text-muted-foreground italic">
              {diff ? 'Generating...' : 'No changes to commit'}
            </p>
          )}
        </div>
        <div className="neu-card p-6">
          <h3 className="font-semibold mb-2">Risk & Confidence</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-2 py-1 rounded-neu-sm neu-section font-semibold flex items-center gap-1 ${
              generatedRisk === 'high' ? 'text-red-600' : generatedRisk === 'medium' ? 'text-amber-600' : 'text-green-600'
            }`}>
              <ShieldAlert className="w-3 h-3" /> 
              {generatedRisk.toUpperCase()} Risk
            </span>
            <span className="px-2 py-1 rounded-neu-sm neu-section text-foreground font-semibold">
              Confidence {generatedConfidence}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          disabled={!diff}
          className="neu-button px-4 py-2 rounded-neu-sm text-primary font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4" /> Approve
        </button>
        <button 
          onClick={() => navigate('/automation-rules', { state: { repoName, stats } })} 
          className="neu-button px-4 py-2 rounded-neu-sm text-foreground font-semibold"
        >
          Apply Rule
        </button>
        <button 
          onClick={handleOpenReview} 
          disabled={!diff}
          className="neu-button px-4 py-2 rounded-neu-sm text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Open Review
        </button>
      </div>
    </div>
  )
}
