import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  title: string
  value: string | number
  trend?: string
  color?: 'primary' | 'secondary' | 'success' | 'destructive'
  loading?: boolean
}

export default function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  trend, 
  color = 'primary',
  loading 
}: StatCardProps) {
  
  const colorMap = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    destructive: 'text-destructive',
  }

  if (loading) {
    return (
      <div className="neu-card p-6 animate-pulse">
        <div className="w-12 h-12 rounded-full neu-section mb-4"></div>
        <div className="h-4 w-24 neu-section rounded mb-2"></div>
        <div className="h-8 w-16 neu-section rounded"></div>
      </div>
    )
  }

  return (
    <div className="neu-card p-6 hover:shadow-neu-hover transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-full neu-button flex items-center justify-center group-hover:scale-105 transition-all duration-300">
          <Icon className={`w-5 h-5 ${colorMap[color]} transition-colors`} />
        </div>
        
        {trend && (
          <div className="px-2.5 py-1 rounded-neu-sm neu-section text-[11px] font-medium text-foreground/80 flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full bg-current ${colorMap[color]}`} />
            {trend}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1 tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{value}</p>
      </div>
    </div>
  )
}
