# GitPulse

**Grammarly for Code** — AI writes your commit messages, PR descriptions, and code documentation automatically.

## Vision

Stop context-switching to write docs. Let AI handle documentation while you code. GitPulse understands your codebase context, your team's conventions, and your project history to generate accurate, consistent documentation across your entire workflow.

## Architecture

```
GitPulse v3.0 (TypeScript + Ink)
├── src/
│   ├── index.ts          # CLI entry point
│   ├── components/       # React Ink UI components
│   │   ├── App.tsx
│   │   ├── ClaudeUI.tsx  # Shared UI primitives
│   │   ├── CommitWizard.tsx
│   │   ├── StatusPanel.tsx
│   │   ├── ConfigPanel.tsx
│   │   ├── ExplainView.tsx
│   │   └── PRGenerator.tsx
│   ├── core/             # Git operations & models
│   │   ├── git.ts
│   │   └── models.ts
│   ├── ai/               # AI provider integrations
│   │   └── providers.ts
│   └── utils/            # Configuration & helpers
│       └── config.ts
├── dist/                 # Compiled output
├── package.json
└── tsconfig.json
```

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev -- commit

# Smart commit with AI-generated message
npm start -- commit

# Show repository status
npm start -- status

# Explain code history for a file
npm start -- explain src/auth.ts

# Generate PR description
npm start -- pr

# Manage configuration
npm start -- config show
```

## Tech Stack

- **TypeScript** — CLI with rich terminal UI
- **Ink** — React-based terminal UI framework (Claude Code style)
- **simple-git** — Git operations
- **Multi-model AI** — OpenRouter, Ollama, OpenAI support
- **VSCode Extension** — IDE integration (coming soon)
- **GitHub Action** — PR automation (coming soon)

## Configuration

Create a `.env` file or use `gitpulse config`:

```bash
# AI Provider (ollama, openrouter, openai)
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

OPENROUTER_API_KEY=your_key_here

# Commit style (conventional, semantic, simple)
COMMIT_STYLE=conventional
```

## Commands

| Command | Description |
|---------|-------------|
| `commit` | AI-generated commit messages with context awareness |
| `status` | Repository status with diff preview |
| `doc <file>` | Generate code documentation with AI |
| `pr` | Generate comprehensive PR descriptions |
| `explain <file>` | Explain file history with AI |
| `config` | Manage settings |

## Roadmap

### Phase 1: Core CLI (Current)
- ✅ AI commit message generation
- ✅ Repository status display
- ✅ File history explanation
- ✅ PR description generation
- ✅ Claude Code-style UI

### Phase 2: Documentation Engine (In Progress)
- 🔄 AI code documentation generation
- ⏳ AST-based code analysis
- ⏳ Team convention learning
- ⏳ Documentation coverage metrics

### Phase 3: Distribution (Planned)
- ⏳ VSCode extension
- ⏳ GitHub Action for PR automation
- ⏳ Web dashboard for team analytics
- ⏳ Issue tracker integration (GitHub/Linear/Jira)

## Development

```bash
npm install
npm run dev    # Development with hot reload
npm run build  # Compile to dist/
npm start      # Run compiled version
```
