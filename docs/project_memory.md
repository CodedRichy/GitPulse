# Project Memory: GitPulse

## Project Name
GitPulse

## Purpose
GitPulse is a privacy-first, fully automated Git commit assistant that watches repositories and automatically generates meaningful commit messages using local or cloud AI.

## Current Status
**v1.0.0 (Production-Ready)**
The project has completed multiple phases of development:
- Core multi-provider AI support (Ollama, OpenAI, Anthropic).
- Comprehensive analytics tracking (commits, push rates, repo stats).
- Commercial features including Stripe payment integration and tiered pricing.
- Team workspaces and collaboration tools.
- Modern Electron/React desktop application.
- Full CI/CD with GitHub Actions.

## Tech Stack
### Backend (Python 3.10+)
- **Core:** `watchdog`, `rich`, `tkinter`.
- **AI Integration:** Ollama (local), OpenAI, Anthropic.
- **API Server:** REST API built for remote access.
- **Deployment:** Docker support, PyPI package.

### Desktop Application (Electron 28+)
- **Frontend:** React 18, TypeScript, TailwindCSS.
- **State Management:** Zustand.
- **Build Tools:** Vite, `electron-builder`.

## Architecture Overview
Modular system consisting of:
- **Core Python Backend:** Handles file observation, AI processing, and Git operations.
- **Desktop App (Electron):** Provides a modern GUI and controls the backend.
- **AI Abstraction Layer:** Supports multiple providers with automatic fallback.
- **Analytics Engine:** Tracks usage and performance metrics.

## Key Components
- **File System Observer:** Monitors changes across target repositories.
- **AI Provider Manager:** Manages communication with different AI services.
- **Git Operations Engine:** Handles the add-commit-push sequence.
- **Team Workspace Manager:** Facilitates shared settings and collaboration.

## Data Flow
1. **Observation:** Detect filesystem events in watched repos.
2. **Evaluation:** Debounce changes and map to specific repositories.
3. **Processing:** AI analyzes git diffs to generate commit messages.
4. **Synchronization:** Automated Git sequence (add, commit, push).

## Key Decisions
- **Privacy-First (Ollama):** Local AI is the default to ensure code remains on the user's machine.
- **Modular Design:** Separate backend and frontend allowed for both CLI and GUI interfaces.
- **Automatic Fallback:** Ensures high availability by switching AI providers if one fails.
- **Electron for Desktop:** Chosen for its cross-platform compatibility and rich UI capabilities.

## Known Issues
- TypeScript strictness occasionally requires relaxed `tsconfig` settings for Electron compatibility.
- (Further issues to be identified during active maintenance).

## Current Focus
Post-launch stabilization and gathering user feedback from the beta program.

## Next Steps
- Implement advanced commit message templates.
- Integrate git hooks.
- Develop repository-specific settings.
- Explore mobile companion app and IDE plugins.
