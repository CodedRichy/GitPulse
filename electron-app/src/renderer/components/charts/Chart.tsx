import { BarChart3 } from 'lucide-react'

interface ChartProps {
  title: string
  type: 'bar' | 'line' | 'pie'
  data?: any[]
  loading?: boolean
  height?: number
}

export default function Chart({ title, type, data = [], loading = false, height = 250 }: ChartProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div style={{ height }} className="flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div style={{ height }} className="flex items-center justify-center bg-muted/50 rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No data available</p>
            <p className="text-xs text-muted-foreground mt-1">Chart visualization coming soon</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div style={{ height }} className="bg-muted/50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-primary mx-auto mb-2" />
          <p className="text-foreground font-semibold">Interactive Chart</p>
          <p className="text-xs text-muted-foreground mt-1">Recharts integration coming soon</p>
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Data points: {data.length}</p>
            <p>Chart type: {type}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
