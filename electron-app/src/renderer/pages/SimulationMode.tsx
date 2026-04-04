import { FlaskConical, PlayCircle } from 'lucide-react'

export default function SimulationMode() {
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Simulation Mode</h1>
        <p className="text-muted-foreground mt-1">Preview what GitPulse would commit without writing changes.</p>
      </div>

      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-primary" /><h2 className="text-xl font-semibold">Dry Run Preview</h2></div>
        <div className="neu-section rounded-neu-sm p-4 text-sm text-foreground space-y-1 font-mono">
          <p>[simulate] detected 6 file changes</p>
          <p>[simulate] generated commit message draft</p>
          <p>[simulate] risk score: 41 (low)</p>
          <p>[simulate] would commit, would not push (rule: manual push)</p>
        </div>
        <button className="neu-button px-4 py-2 rounded-neu-sm text-primary font-semibold inline-flex items-center gap-2"><PlayCircle className="w-4 h-4" /> Run Simulation</button>
      </div>
    </div>
  )
}
