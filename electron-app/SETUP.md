# GitPulse Electron Desktop App - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (for backend)
- Git

### Installation

1. **Install Dependencies**
```bash
cd electron-app
npm install
```

2. **Start Development**
```bash
npm run dev
```

This will:
- Start the Vite dev server (React frontend)
- Compile TypeScript (Electron main process)
- Launch the Electron app

### Build for Production

```bash
# Build all
npm run build

# Package for Windows
npm run package:win

# Package for macOS
npm run package:mac

# Package for Linux
npm run package:linux
```

## 📁 Project Structure

```
electron-app/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # App entry, window management
│   │   └── preload.ts     # IPC bridge
│   └── renderer/          # React frontend
│       ├── main.tsx       # React entry point
│       ├── App.tsx        # Main app component
│       ├── pages/         # Page components
│       ├── components/    # Reusable components
│       └── styles/        # CSS files
├── dist/                  # Compiled output
├── release/               # Packaged installers
└── python-backend/        # Python backend (symlink to parent)
```

## 🔧 Development

### Hot Reload
- React changes reload automatically (Vite HMR)
- Electron main process requires restart

### Debugging
- React DevTools: Available in development
- Electron DevTools: Opens automatically in dev mode
- Python logs: Streamed to Electron console

### Environment Variables
Create `.env` file:
```
NODE_ENV=development
```

## 🎨 UI Framework

- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Charts

## 🔗 Python Integration

The Electron app communicates with Python backend via:
1. **HTTP API** - REST endpoints (port 5000)
2. **Process Spawning** - Direct Python process control
3. **IPC** - Inter-process communication

## 📦 Building

### Windows
```bash
npm run package:win
```
Output: `release/GitPulse Setup.exe`

### macOS
```bash
npm run package:mac
```
Output: `release/GitPulse.dmg`

### Linux
```bash
npm run package:linux
```
Output: `release/GitPulse.AppImage` or `.deb`

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
npm install
```

### Python backend not starting
- Ensure Python is in PATH
- Check `git-pulse.py` exists in parent directory

### Build fails
- Clear dist: `rm -rf dist`
- Reinstall: `rm -rf node_modules && npm install`

## 🎯 Next Steps

1. Install dependencies: `npm install`
2. Create App.tsx component
3. Build page components (Dashboard, Repos, etc.)
4. Test with Python backend
5. Package for distribution

## 📝 Notes

- All TypeScript/module errors will resolve after `npm install`
- Python backend must be running for full functionality
- GitHub OAuth requires client ID configuration
