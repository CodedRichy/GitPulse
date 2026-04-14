# GitPulse

**Grammarly for Code** — AI writes your commit messages, PR descriptions, and code documentation automatically.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Smart commit with AI-generated message
npm start -- commit

# Show repository status
npm start -- status

# Generate PR description
npm start -- pr
```

## Documentation

All project documentation is consolidated in `/docs/`:

- **`docs/project_memory.md`** - Primary source of truth (read this first)
- **`docs/architecture.md`** - System design and modules
- **`docs/dev_log.md`** - Development history
- **`docs/tasks.md`** - Task tracking
- **`docs/agent.md`** - AI usage instructions

## Configuration

```bash
# AI Provider (ollama, openrouter, openai)
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Commit style (conventional, semantic, simple)
COMMIT_STYLE=conventional
```

## Vision

Stop context-switching to write docs. Let AI handle documentation while you code. GitPulse understands your codebase context, your team's conventions, and your project history to generate accurate, consistent documentation across your entire workflow.

## Tech Stack

- **TypeScript** — CLI with rich terminal UI
- **Ink** — React-based terminal UI framework
- **Multi-model AI** — OpenRouter, Ollama, OpenAI support
