# Architecture: GitPulse

## System Design
GitPulse is designed as a modular, decoupled application with a Python backend and an optional Electron-based frontend.

### High-Level Architecture
- **Observer Pattern:** Uses `watchdog` to monitor filesystem changes across multiple repositories.
- **Provider Pattern:** Abstract AI layer allows switching between Ollama, OpenAI, and Anthropic.
- **RESTful API:** Communication between the Electron UI and Python backend occurs via a lightweight local API server.

## Modules and Responsibilities
### `backend/`
- `main.py`: Entry point for CLI/Background mode and orchestrator.
- `core/config.py`: Centralized configuration and tier-based feature management.
- `ai/providers.py`: Abstraction layer for different AI service implementations.
- `analytics/engine.py`: Records usage metrics, errors, and performance data.
- `api/server.py`: REST API endpoints for UI interaction.
- `git/operations.py`: Implementation of automated Git workflows.
- `team/workspace.py`: Logic for managing shared team spaces.
- `payments/stripe.py`: Handling of subscriptions and licenses.

### `electron-app/`
- `src/main/`: Electron main process, window management, and system tray integration.
- `src/renderer/`: React-based dashboard for managing repositories and viewing analytics.

## Folder Structure Explanation
```
/
├── backend/            # Python backend logic
│   ├── ai/             # AI provider implementations
│   ├── api/            # Local REST API server
│   ├── core/           # Configuration and core utilities
│   ├── git/            # Git workflow automation
│   ├── analytics/      # Metric tracking system
│   └── tests/          # Python test suite
├── electron-app/       # Desktop application (React/TS)
├── docs/               # Memory system and documentation
├── web/                # Marketing landing page
├── scripts/            # Development and utility scripts
├── requirements.txt    # Python dependencies
└── README.md           # Quick-start and overview (root-level)
```

## Component Interaction
1. The **Watcher** detects a file save.
2. It triggers a **Debounce Timer** (default 60s) for that repository.
3. Once silent, the **Diff Engine** extracts changes.
4. The **AI Manager** requests a summary from the active provider.
5. Upon receiving the message, the **Git Engine** executes `add`, `commit`, and `push`.
6. **Analytics** records the success and performance of the operation.
7. The **Electron UI** polls the **API Server** to update the dashboard in real-time.
