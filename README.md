# GitPulse

**The Privacy-First, Fully Automated Git Commit Assistant**

GitPulse is an intelligent Git automation tool that watches your repositories and automatically generates meaningful commit messages using local or cloud AI. Unlike GitHub Copilot, your code never leaves your machine when using local AI models.

## Features

### Multi-Provider AI Support
- **Local AI (Ollama)** - Privacy-first, zero cost, works offline
- **OpenAI GPT** - Cloud-based, high quality
- **Anthropic Claude** - Advanced reasoning
- **Automatic Fallback** - Tries each provider until one succeeds

### Smart Automation
- **Multi-Repository Monitoring** - Watch unlimited repos simultaneously
- **Intelligent Debouncing** - Waits for coding silence (default 60s) before committing
- **Context-Aware Messages** - AI analyzes git diffs, not entire files
- **Selective Watching** - Respects `.gitignore` and custom patterns

### Flexible Interface
- **GUI Mode** - Clean dashboard with real-time status
- **CLI Mode** - Rich terminal interface for remote work
- **Background Mode** - Runs silently in system tray
- **Desktop App** - Modern Electron application with React UI

### Enterprise-Ready
- **Privacy First** - Local AI keeps code on your machine
- **Error Recovery** - Smart classification and auto-retry
- **Analytics** - Track productivity and AI accuracy
- **Secure** - Auto-excludes `.env` and sensitive files

## Architecture

GitPulse operates as a modular system with multiple interfaces:

### Core Python Backend
- **File System Observer** - Uses `watchdog` to monitor repository changes
- **AI Provider Manager** - Abstract layer supporting multiple AI services
- **Git Operations Engine** - Handles add, commit, push sequences
- **Analytics Tracker** - Records usage metrics and performance

### Desktop Application (Electron)
- **React Frontend** - Modern UI with TypeScript and TailwindCSS
- **Main Process** - Controls Python backend and system integration
- **IPC Bridge** - Secure communication between UI and backend
- **System Integration** - Tray, notifications, auto-launch

### Data Flow
1. **Observation**: File system events detected across target repositories
2. **Evaluation**: Changes mapped to repos with debounced timers
3. **Processing**: AI generates commit messages from git diffs
4. **Synchronization**: Automated add, commit, push sequence

## Tech Stack

### Python Backend
- **Language**: Python 3.10+
- **Core Libraries**: `watchdog`, `rich`, `tkinter`
- **AI Integration**: Ollama (local), OpenAI, Anthropic APIs
- **Configuration**: JSON-based with environment variables

### Desktop Application
- **Framework**: Electron 28+ with React 18
- **Language**: TypeScript
- **Styling**: TailwindCSS with dark mode support
- **Build Tools**: Vite, electron-builder
- **State Management**: Zustand

### Development Tools
- **Testing**: pytest for Python backend
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Linting**: Standard Python PEP8 patterns
- **Package Management**: pip (Python), npm (Node.js)

## Repository Structure

```
/
├── .github/                 → GitHub configuration
│   ├── workflows/          → CI/CD workflows
│   │   └── ci.yml          → Continuous integration
│   └── ISSUE_TEMPLATE/     → Issue templates
├── backend/                  → Modular Python backend
│   ├── main.py              → Main application entry point
│   ├── core/                → Core functionality
│   │   └── config.py       → Configuration management
│   ├── ai/                  → AI provider services
│   │   └── providers.py     → AI abstraction layer
│   ├── analytics/           → Usage tracking and metrics
│   │   └── engine.py       → Analytics engine
│   ├── api/                 → HTTP API server
│   │   └── server.py       → REST API endpoints
│   ├── git/                 → Git operations
│   │   └── commit_preview.py
│   ├── integrations/        → Third-party integrations
│   │   └── handlers.py     → Integration handlers
│   ├── team/                → Team collaboration
│   │   └── workspace.py    → Team workspace management
│   ├── payments/            → Payment processing
│   │   └── stripe.py       → Stripe integration
│   ├── deploy/              → Deployment utilities
│   │   └── manager.py      → Deployment manager
│   └── tests/               → Backend test suite
│       ├── test_ai_providers.py
│       ├── test_analytics.py
│       └── test_config.py
├── electron-app/            → Modern desktop application
│   ├── src/
│   │   ├── main/           → Electron main process
│   │   └── renderer/       → React frontend
│   ├── package.json        → Node.js dependencies
│   ├── electron-builder.yml → Build configuration
│   └── dist/               → Compiled output
├── scripts/                → Development and utility scripts
│   ├── run-tests.py        → Test runner
│   └── setup-dev.py        → Development setup
├── web/                    → Web interface (optional)
│   ├── index.html
│   └── style.css
├── docs/                   → Documentation
│   ├── ARCHITECTURE.md
│   ├── CHANGELOG.md
│   └── DEVELOPMENT.md
├── requirements.txt         → Python dependencies
├── .env                    → Environment variables
├── .gitignore              → Git ignore patterns
├── LICENSE                 → License information
└── README.md               → This file
```

## Installation

### Prerequisites
- Python 3.10 or higher
- Git installed and configured with remote `origin`
- Node.js 18+ (for desktop app)

### Python Backend Setup
```bash
# Clone repository
git clone https://github.com/CodedRichy/GitPulse.git
cd GitPulse

# Install Python dependencies
pip install -r requirements.txt

# Optional: Desktop notifications
pip install plyer
```

### Desktop App Setup
```bash
# Navigate to electron app
cd electron-app

# Install Node.js dependencies
npm install

# Run development mode
npm run dev
```

### AI Provider Setup

#### Option 1: Local AI (Recommended - Free & Private)
```bash
# Install Ollama from https://ollama.ai
ollama pull qwen3.5:9b
```

#### Option 2: Cloud AI (Optional)
Create `.env` file with API keys:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

### Python Backend

#### GUI Mode
```bash
python backend/main.py
```

#### CLI Mode
```bash
python backend/main.py --cli
```

#### Background Mode
```bash
python backend/main.py --detach
```

### Desktop Application
```bash
cd electron-app
npm run dev          # Development
npm run package:win  # Build Windows installer
npm run package:mac  # Build macOS DMG
npm run package:linux # Build Linux AppImage
```

## Configuration

Create `.gitpulse.json` to customize settings:

```json
{
  "watch_root": "C:\\Users\\User\\Documents\\GitHub",
  "debounce_seconds": 60,
  "ai_provider": "ollama",
  "ollama_model": "qwen3.5:9b",
  "openai_model": "gpt-4o-mini",
  "anthropic_model": "claude-3-haiku-20240307",
  "min_diff_for_summary": 200,
  "max_diff_for_summary": 1500,
  "enable_analytics": true,
  "enable_notifications": true,
  "commit_preview": false,
  "auto_push": true,
  "theme": "system"
}
```

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key

## Development

### Running Tests
```bash
# Run all backend tests
python scripts/run-tests.py

# Run specific module tests
python -m pytest backend/tests/

# Test specific module
python -m pytest backend/tests/test_ai_providers.py
```

### Code Style
- Python follows PEP8 standards
- TypeScript uses ESLint and Prettier (configured in electron-app)
- Commit messages follow conventional format

### Adding Features
1. **Backend**: Modify modules in `backend/` directory
2. **UI**: Update React components in `electron-app/src/renderer/`
3. **Integration**: Update IPC bridge in `electron-app/src/main/preload.ts`
4. **API**: Add endpoints in `backend/api/server.py`

### Debugging
- Python logs: `.git-pulse.log`
- Electron DevTools: Available in development mode
- Analytics data: `.gitpulse-analytics.json`
- API server: Runs on http://localhost:8000 (when enabled)

## Testing

The project includes comprehensive test coverage:

- **AI Providers**: Test all AI service integrations
- **Analytics**: Verify metrics tracking and data persistence
- **Configuration**: Test settings loading and validation

Run tests with:
```bash
python scripts/run-tests.py
```

## CI/CD

GitPulse uses GitHub Actions for automated testing and deployment:

- **Continuous Integration**: Automated testing on pull requests
- **Automated Testing**: Runs full test suite on multiple Python versions
- **Code Quality**: Enforces code style and standards
- **Deployment**: Automated builds for desktop applications

The CI configuration is located in `.github/workflows/ci.yml`.

## Deployment

### Python Backend
Modular application - copy the entire `backend/` directory and `requirements.txt` to target system.

### Desktop Application
```bash
cd electron-app
npm run build
npm run package        # Build for current platform
npm run package:all    # Build for all platforms
```

Output installers created in `electron-app/release/`:
- Windows: `.exe` installer
- macOS: `.dmg` disk image
- Linux: `.AppImage` portable app

### Auto-Update
Desktop app includes electron-updater for automatic updates.

## Roadmap

### Completed Features
- Multi-provider AI support
- Desktop application with modern UI
- Analytics and usage tracking
- System tray integration

### Planned Features
- [ ] Team collaboration features
- [ ] Advanced commit message templates
- [ ] Git hooks integration
- [ ] Repository-specific settings
- [ ] Performance optimizations

### Future Enhancements
- [ ] Web-based dashboard
- [ ] Mobile companion app
- [ ] Enterprise SSO integration
- [ ] Advanced analytics and reporting

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes with clear messages
4. **Test** your changes thoroughly
5. **Push** to your fork and submit a pull request

### Development Workflow
- Use `python backend/main.py --cli` for real-time debugging
- Test with multiple AI providers
- Verify cross-platform compatibility
- Update documentation as needed

## License

Copyright (c) 2025 Rishi Praseeth Krishnan. All rights reserved.

This repository and its source code are made visible for viewing and reference only. No license is granted to use, copy, modify, distribute, or create derivative works from this software without express written permission from the copyright holder.

Viewing the code (e.g., on GitHub) does not constitute permission to use it.

---

**GitPulse** - Automate your Git workflow with AI-powered commit messages.
