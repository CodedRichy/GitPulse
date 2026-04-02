import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Zap, Play, Square, Plus, Activity } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Repositories from './pages/Repositories'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Account from './pages/Account'

declare global {
  interface Window {
    electronAPI: {
      getAnalytics: () => Promise<any>
      getRepositories: () => Promise<any>
      getConfig: () => Promise<any>
      updateConfig: (config: any) => Promise<any>
      startMonitoring: () => Promise<any>
      stopMonitoring: () => Promise<any>
      getGitHubToken: () => Promise<string | null>
      setGitHubToken: (token: string) => Promise<any>
      clearGitHubToken: () => Promise<any>
      onPythonOutput: (callback: (output: string) => void) => void
      onPythonError: (callback: (error: string) => void) => void
      onPythonStopped: (callback: (code: number) => void) => void
    }
  }
}

function App() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    if (window.electronAPI) {
      window.electronAPI.onPythonOutput((output) => {
        console.log('[Python]', output)
      })

      window.electronAPI.onPythonError((error) => {
        console.error('[Python Error]', error)
      })

      window.electronAPI.onPythonStopped((code) => {
        console.log('[Python] Stopped with code', code)
        setIsMonitoring(false)
      })
    }
  }, [darkMode])

  const toggleMonitoring = async () => {
    if (isMonitoring) {
      await window.electronAPI?.stopMonitoring()
      setIsMonitoring(false)
    } else {
      await window.electronAPI?.startMonitoring()
      setIsMonitoring(true)
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  return (
    <Router>
      <div 
        className="flex flex-col h-screen text-foreground overflow-hidden"
        style={{ 
          backgroundColor: darkMode ? '#1E2022' : '#F0F5F9',
          color: darkMode ? '#F0F5F9' : '#1E2022'
        }}
      >
        {/* Custom Title Bar - Neumorphic Style */}
        <div 
          className="h-12 shrink-0 z-50 flex items-center justify-between px-4 relative border-b"
          style={{ 
            backgroundColor: darkMode ? '#1E2022' : '#F0F5F9',
            borderColor: darkMode ? '#52616B' : '#C9D6DF',
            WebkitAppRegion: 'drag'
          } as React.CSSProperties}
        >
          {/* Logo & Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-neu-sm neu-button">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground text-sm font-bold tracking-wide">GitPulse</span>
            </div>
            
            {/* Global Status Indicator */}
            <div className="h-4 w-px bg-black/5 mx-2" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-neu-sm neu-section text-xs font-medium">
              <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-success glow-success animate-pulse' : 'bg-destructive'}`} />
              <span className={isMonitoring ? 'text-success' : 'text-muted-foreground'}>
                {isMonitoring ? 'Monitoring Active' : 'System Idle'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="flex items-center gap-2 pr-2">
              <button 
                onClick={toggleMonitoring}
                className={`neu-button flex items-center gap-1.5 px-3 py-1.5 rounded-neu-sm text-xs font-semibold transition-all duration-300 ${
                  isMonitoring 
                  ? 'text-destructive' 
                  : 'text-success'
                }`}
              >
                {isMonitoring ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                {isMonitoring ? 'Stop' : 'Start'}
              </button>
              
              <button className="neu-button p-1.5 rounded-neu-sm text-muted-foreground hover:text-primary transition-all duration-300">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Space for native window controls (titleBarOverlay) */}
            <div className="w-[120px]" />
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            isMonitoring={isMonitoring} 
            onToggleMonitoring={toggleMonitoring}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
          />
          <main 
            className="flex-1 overflow-auto p-6 transition-all duration-300 relative"
            style={{ backgroundColor: darkMode ? '#1E2022' : '#F0F5F9' }}
          >
            <div className="max-w-7xl mx-auto h-full animate-fade-in relative z-10">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard isMonitoring={isMonitoring} />} />
                <Route path="/repositories" element={<Repositories />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/account" element={<Account />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
