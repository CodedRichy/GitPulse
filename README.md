# GitPulse v3.0

**Cursor for Git** — AI-powered Git workflow assistant.

## Vision

Make AI your Git workflow partner. It understands your codebase context, your team's conventions, and your project's history.

## Architecture

```
GitPulse v3.0
├── cli/           # Rust CLI (primary interface)
├── vscode-ext/    # VSCode extension (UI layer)
├── core/          # Shared Rust library
├── ai/            # AI orchestration layer
└── docs/          # Documentation
```

## Quick Start

```bash
# Install
brew install gitpulse  # or download binary

# Smart commit
gitpulse commit

# Explain code history
gitpulse explain src/auth.py

# Generate PR
gitpulse pr
```

## Tech Stack

- **Rust** — CLI + core library (performance, single binary)
- **TypeScript** — VSCode extension
- **SQLite** — Local context storage
- **Multi-model AI** — Dynamic model selection

## Status

🚧 **In Development** — v3.0 rewrite in progress

Previous versions archived at `archive/python-v2` branch.
