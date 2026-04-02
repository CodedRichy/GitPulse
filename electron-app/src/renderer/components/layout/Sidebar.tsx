import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderGit2, BarChart3, Settings, User, Zap, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarProps {
  isMonitoring: boolean
  onToggleMonitoring: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export default function Sidebar({ isMonitoring, onToggleMonitoring, darkMode, onToggleDarkMode, isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/repositories', icon: FolderGit2, label: 'Repositories' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/account', icon: User, label: 'Account' },
  ]

  return (
    <div 
      id="sidebar-container"
      className={`
        text-card-foreground flex flex-col h-[calc(100vh-3rem)] 
        border-r transition-all duration-300 relative z-40
        ${isOpen ? 'w-64' : 'w-20'}
      `}
      style={{
        backgroundColor: darkMode ? '#1E2022' : '#F0F5F9',
        borderColor: darkMode ? '#52616B' : '#C9D6DF'
      }}
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-neu-surface shadow-neu-sm flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-black/5 z-50"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-3 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-neu-sm transition-all duration-300 group relative
                ${isActive 
                  ? 'bg-neu-surface text-primary shadow-neu-pressed-sm' 
                  : 'text-muted-foreground hover:bg-neu-surface hover:text-foreground shadow-neu-flat hover:shadow-neu-pressed-sm'
                }
              `}
              title={!isOpen ? item.label : undefined}
            >
              <div className={`relative flex items-center justify-center w-6 h-6 transition-all duration-300
                ${isActive ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'group-hover:scale-110'}
              `}>
                <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-primary' : ''}`} />
              </div>
              
              <span className={`font-medium whitespace-nowrap transition-all duration-300
                ${isOpen ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0 ml-0 overflow-hidden'}
              `}>
                {item.label}
              </span>

              {/* Active Indicator Glow */}
              {isActive && isOpen && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-neu-primary-glow animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-black/5 space-y-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => {
            console.log('Dark mode button clicked!')
            onToggleDarkMode()
          }}
          className={`
            w-full flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center'} py-3 
            rounded-lg shadow-sm border border-black/10
            transition-all duration-300 active:scale-95
          `}
          style={{
            backgroundColor: darkMode ? '#1E2022' : '#F0F5F9',
            color: darkMode ? '#F0F5F9' : '#1E2022',
          }}
          title={!isOpen ? (darkMode ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          <div className="flex items-center justify-center w-5 h-5">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
            ${isOpen ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0 overflow-hidden'}
          `}>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        {/* Upgrade Button */}
        <button 
          className={`
            w-full flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center'} py-3 
            rounded-lg shadow-sm border border-black/10
            transition-all duration-300 group relative overflow-hidden
          `}
          style={{
            backgroundColor: darkMode ? '#1E2022' : '#F0F5F9',
            color: darkMode ? '#F0F5F9' : '#1E2022',
          }}
          title={!isOpen ? 'Upgrade to Pro' : undefined}
        >
          {/* Subtle gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          <div className="relative flex items-center justify-center w-5 h-5 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all">
            <Zap className="w-4 h-4" />
          </div>
          <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
            ${isOpen ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0 overflow-hidden'}
          `}>
            Pro Tier
          </span>
        </button>
      </div>
    </div>
  )
}
