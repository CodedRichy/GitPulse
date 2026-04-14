# GitPulse - Project Memory

## Project Overview

**Name:** GitPulse  
**Purpose:** Grammarly for Code — AI writes your commit messages, PR descriptions, and code documentation automatically.  
**Vision:** Stop context-switching to write docs. Let AI handle documentation while you code. GitPulse understands your codebase context, your team's conventions, and your project history to generate accurate, consistent documentation across your entire workflow.

## Current Status

**Phase:** Phase 5 - MCP Integration & Distribution ✅ Complete
**Status:** Phase 5 implementation complete. GitPulse is now an MCP server with quality gates and context-aware intelligence.

### Completed Features (Phase 1-5)

**Core Features:**
- ✅ AI commit message generation
- ✅ Repository status display
- ✅ File history explanation
- ✅ PR description generation
- ✅ Claude Code-style UI
- ✅ Interactive diff preview for commit command
- ✅ Smart undo/redo functionality with history tracking
- ✅ Real-time learning from user corrections
- ✅ Multi-model AI support (OpenRouter, Ollama, Google, Groq)
- ✅ Auto model selection based on task context
- ✅ One-command setup with auto-configuration
- ✅ Pre-commit hooks integration
- ✅ Multi-file context for AI generation
- ✅ Branch management commands (create, switch, delete, list, rename, suggest)
- ✅ Conflict resolution assistant with AI
- ✅ Branch intelligence and AI-powered suggestions
- ✅ Code review automation with static analysis + AI
- ✅ Issue tracker integration (GitHub/Linear/Jira)

**Phase 5 - MCP Integration & Quality Gates:**
- ✅ **MCP Server Foundation** - Exposes git intelligence as MCP tools/resources
  - `analyze_repo` - Repository health & metrics
  - `suggest_commit` - AI commit message generation
  - `review_changes` - Quality review of staged changes
- ✅ **Quality Gates** - Prevents AI-generated tech debt
  - Security Scan (hardcoded secrets, SQL injection, XSS, path traversal)
  - Code Smells (long functions, TODO/FIXME, console.log, debugger)
  - Test Coverage (missing tests for changed files)
  - Documentation (missing JSDoc on exports)
  - `--strict` flag blocks commit on failures
  - `--lax` flag hides warnings
- ✅ **Context-Aware Intelligence** - AI that learns your team's conventions
  - Analyzes commit history to extract patterns
  - Detects naming conventions (camelCase, PascalCase, etc.)
  - Identifies architectural boundaries
  - Finds file relationships (co-changes)
  - Saves conventions to `.gitpulse/conventions.json`
  - Injects team context into AI prompts

### Planned (Future)
- ⏳ VSCode extension
- ⏳ GitHub Action for PR automation
- ⏳ Web dashboard for team analytics
- ⏳ Additional MCP tools (batch operations, advanced queries)

## Tech Stack

- **TypeScript** — CLI with rich terminal UI
- **Ink** — React-based terminal UI framework (Claude Code style)
- **simple-git** — Git operations
- **Multi-model AI** — OpenRouter, Ollama, OpenAI support
- **Next.js** — Web dashboard (in web/ directory)

## Architecture Overview

GitPulse v3.0 (TypeScript + Ink)

```
src/
├── index.ts              # CLI entry point
├── components/           # React Ink UI components
│   ├── App.tsx
│   ├── CommitWizard.tsx  # Commit with diff preview, edit, retry
│   ├── StatusPanel.tsx
│   ├── ConfigPanel.tsx
│   ├── ExplainView.tsx
│   ├── PRGenerator.tsx
│   ├── UndoRedo.tsx      # Undo/redo with history
│   ├── DocGenerator.tsx
│   ├── Analyzer.tsx
│   └── Welcome.tsx       # Welcome screen with model selector
├── core/                 # Git operations & models
│   ├── git.ts            # Git operations including undo/redo
│   └── models.ts
├── ai/                   # AI provider integrations
│   ├── providers.ts      # OpenRouter, Ollama, Google, Groq
│   ├── learning.ts       # Real-time learning from corrections
│   ├── model-selector.ts # Auto model selection
│   └── model-tester.ts   # Model testing and benchmarking
├── utils/                # Configuration & helpers
│   ├── config.ts         # Config management with model aliases
│   ├── history.ts        # Commit history tracking
│   └── settings.ts       # User settings persistence
└── commands/             # CLI commands (future)
    ├── branch.ts
    ├── init.ts
    ├── resolve.ts
    ├── review.ts
    └── test.ts
```

## Key Components

### CLI Commands
- `commit` — AI-generated commit messages with diff preview, edit, and retry
- `status` — Repository status with file changes
- `undo` — Undo last commit with confirmation
- `redo` — Redo last undone commit
- `doc <file>` — Generate code documentation with AI
- `pr` — Generate comprehensive PR descriptions
- `explain <file>` — Explain file history with AI
- `analyze` — Analyze documentation coverage
- `config` — Manage settings

### AI Integration
- Multi-provider support (Ollama, OpenRouter, Google, Groq)
- Context-aware prompt engineering
- Team convention learning from past commits
- Real-time learning from user corrections
- Auto model selection based on task context
- Model testing and benchmarking tools

## Key Decisions

### Why TypeScript + Ink?
- Type safety for complex CLI logic
- React component model for reusable UI
- Claude Code-style terminal experience
- Hot reload in development

### Why Local-First?
- No rate limits from cloud APIs
- Privacy-first (code never leaves local machine)
- Zero latency with local models (Ollama)
- Offline capability

### Why Multi-Model Support?
- Flexibility for different use cases
- Cost optimization with free models
- Model selection based on task complexity
- Future-proof for new model releases

## Known Issues

None documented

## Current Focus

**Immediate Priority:** Phase 3 - Workflow Enhancement
- One-command setup (`gitpulse init`)
- Pre-commit hooks integration
- Multi-file context for AI generation

## Next Steps

1. Implement one-command setup with auto-configuration
2. Add pre-commit hook installation
3. Implement multi-file context gathering
4. Add branch management commands
5. Add conflict resolution assistant

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

## Development

```bash
npm install
npm run dev    # Development with hot reload
npm run build  # Compile to dist/
npm start      # Run compiled version
```

## Roadmap

### Phase 1: Core CLI ✅ Complete
- ✅ AI commit message generation
- ✅ Repository status display
- ✅ File history explanation
- ✅ PR description generation
- ✅ Claude Code-style UI
- ✅ AI code documentation generation
- ✅ AST-based code analysis
- ✅ Documentation coverage metrics

### Phase 2: Killer Features ✅ Complete
- ✅ Interactive diff preview for commit command
- ✅ Smart undo/redo functionality with history tracking
- ✅ Real-time learning from user corrections

### Phase 3: Workflow Enhancement ✅ Complete
- ✅ One-command setup
- ✅ Pre-commit hooks integration
- ✅ Multi-file context for AI generation
- ✅ Branch management commands
- ✅ Conflict resolution assistant

### Phase 4: Advanced Features ✅ Complete
- ✅ Branch intelligence and suggestions
- ✅ Code review automation with static analysis + AI
- ✅ Issue tracker integration (GitHub/Linear/Jira)

### Phase 5: Distribution (Planned)
- ⏳ VSCode extension
- ⏳ GitHub Action for PR automation
- ⏳ Web dashboard for team analytics

## Research

Detailed AI model research and benchmarks available in `/docs/research/ai-models.md`

## Archived Plans

Detailed implementation plans archived in `/docs/archive/`:
- `grammarly-for-code-plan.md` — Product positioning and GTM strategy
- `implementation-plan.md` — Detailed feature implementation phases
