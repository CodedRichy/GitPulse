import { format } from 'date-fns'

export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm')
  } catch {
    return dateString
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    
    return format(date, 'MMM d')
  } catch {
    return dateString
  }
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatPercentage(value: number): string {
  return Math.round(value).toString() + '%'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function getTierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'free': return 'text-gray-500'
    case 'pro': return 'text-blue-500'
    case 'team': return 'text-purple-500'
    case 'enterprise': return 'text-orange-500'
    default: return 'text-gray-500'
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active': return 'text-green-500'
    case 'waiting': return 'text-yellow-500'
    case 'error': return 'text-red-500'
    case 'offline': return 'text-gray-500'
    default: return 'text-gray-500'
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function downloadFile(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
