# GitPulse Desktop - Modern Electron Application

A professional desktop application for GitPulse built with Electron, React, TypeScript, and TailwindCSS.

## 🎨 What You Get

This is a **modern desktop application** comparable to VS Code, Slack, or Discord:

- ✨ **Beautiful UI** - Modern design with smooth animations
- 🎯 **Native Feel** - System tray, notifications, auto-launch
- 🔗 **GitHub Integration** - OAuth login with profile display
- 📊 **Interactive Analytics** - Charts and visualizations
- ⚡ **Fast Performance** - Optimized React + Vite
- 🌓 **Dark Mode** - Toggle between light/dark themes
- 🖥️ **Cross-Platform** - Windows, macOS, Linux

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run Development Mode
```bash
npm run dev
```

This opens the Electron app with hot reload enabled.

### Build for Production
```bash
# Build everything
npm run build

# Package for your platform
npm run package:win    # Windows .exe
npm run package:mac    # macOS .dmg
npm run package:linux  # Linux .AppImage
```

## 📁 Project Structure

```
electron-app/
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts            # App lifecycle, window management
│   │   └── preload.ts          # IPC bridge (secure)
│   │
│   └── renderer/                # React Frontend
│       ├── main.tsx            # React entry point
│       ├── App.tsx             # Main app with routing
│       ├── components/         # Reusable components
│       │   ├── Sidebar.tsx     # Navigation sidebar
│       │   ├── StatCard.tsx    # Statistics cards
│       │   └── ...
│       ├── pages/              # Page components
│       │   ├── Dashboard.tsx   # Main dashboard
│       │   ├── Repositories.tsx # Repo management
│       │   ├── Analytics.tsx   # Charts & insights
│       │   ├── Settings.tsx    # Configuration
│       │   └── Account.tsx     # GitHub account
│       └── styles/
│           └── globals.css     # TailwindCSS styles
│
├── dist/                        # Compiled output
├── release/                     # Packaged installers
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # TailwindCSS config
└── vite.config.ts              # Vite bundler config
```

## 🔧 How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│         Electron Desktop App            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐ │
│  │ Main Process │◄──►│   Renderer   │ │
│  │  (Node.js)   │    │   (React)    │ │
│  └──────┬───────┘    └──────────────┘ │
│         │                               │
│         ▼                               │
│  ┌──────────────┐                      │
│  │   Python     │                      │
│  │   Backend    │                      │
│  │ (git-pulse)  │                      │
│  └──────────────┘                      │
└─────────────────────────────────────────┘
```

### Communication Flow

1. **React UI** → User interactions
2. **IPC Bridge** → Secure communication to main process
3. **Electron Main** → Controls Python backend
4. **Python Backend** → Git operations, AI processing
5. **HTTP API** → Analytics and config data
6. **Back to React** → Display updates

## 🎨 UI Components

### Pages

1. **Dashboard** - Overview with live stats
   - Total commits, AI commits, success rate
   - Recent activity log
   - Quick actions

2. **Repositories** - Manage watched repos
   - List all repositories
   - Add/remove repos
   - Per-repo settings
   - Status indicators

3. **Analytics** - Detailed insights
   - Interactive charts
   - Productivity metrics
   - AI provider performance
   - Error statistics

4. **Settings** - Configuration
   - AI provider selection
   - Debounce timing
   - Feature toggles
   - Theme preferences

5. **Account** - GitHub integration
   - OAuth login
   - Profile display
   - Tier management
   - Subscription info

### Features

- **System Tray** - Minimize to tray, quick actions
- **Notifications** - Native OS notifications
- **Auto-Launch** - Start on system boot
- **Auto-Update** - Automatic app updates
- **Dark Mode** - Beautiful dark theme
- **Keyboard Shortcuts** - Power user features

## 🔗 Python Integration

The Electron app integrates with the Python backend in two ways:

### 1. Process Control
```typescript
// Start Python backend
await window.electronAPI.startMonitoring()

// Stop Python backend
await window.electronAPI.stopMonitoring()
```

### 2. HTTP API
```typescript
// Get analytics
const analytics = await window.electronAPI.getAnalytics()

// Get repositories
const repos = await window.electronAPI.getRepositories()

// Update config
await window.electronAPI.updateConfig({ ai_provider: 'openai' })
```

## 🎯 Development Tips

### Hot Reload
- React changes reload instantly (Vite HMR)
- Electron main process requires app restart
- Python backend runs independently

### Debugging
```bash
# React DevTools - Available in dev mode
# Electron DevTools - Opens automatically
# Python logs - Visible in Electron console
```

### Adding New Pages
1. Create component in `src/renderer/pages/`
2. Add route in `App.tsx`
3. Add navigation item in `Sidebar.tsx`

### Styling
- Use TailwindCSS utility classes
- Dark mode: `dark:` prefix
- Custom colors in `tailwind.config.js`

## 📦 Building & Distribution

### Development Build
```bash
npm run build
```

### Production Package
```bash
# Windows
npm run package:win
# Output: release/GitPulse Setup 1.0.0.exe

# macOS
npm run package:mac
# Output: release/GitPulse-1.0.0.dmg

# Linux
npm run package:linux
# Output: release/GitPulse-1.0.0.AppImage
```

### Auto-Update
The app includes electron-updater for automatic updates:
- Checks for updates on startup
- Downloads in background
- Prompts user to install

## 🐛 Troubleshooting

### TypeScript Errors
All "Cannot find module" errors will resolve after `npm install`.

### Python Not Starting
- Ensure Python is in PATH
- Check `git-pulse.py` exists in parent directory
- Verify Python dependencies installed

### Build Fails
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### App Won't Start
- Check Electron version compatibility
- Verify Node.js version (18+)
- Check console for errors

## 🎓 Learn More

- **Electron Docs**: https://www.electronjs.org/docs
- **React Docs**: https://react.dev
- **TailwindCSS**: https://tailwindcss.com
- **Vite**: https://vitejs.dev

## 📝 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Create component files (in progress)
3. 🔄 Test with Python backend
4. 🔄 Add GitHub OAuth
5. 🔄 Package for distribution

## 🎉 Result

You'll have a **professional desktop application** that looks and feels like:
- VS Code's clean interface
- Slack's smooth navigation
- Discord's modern design
- GitHub Desktop's polish

**No more retro Python GUI!** This is a real, modern desktop app. 🚀
