# GitPulse

**Grammarly for Code** — AI writes your commit messages, PR descriptions, and code documentation automatically.

**v3.1.0 — Now with MCP Integration, Quality Gates, and Context-Aware Intelligence**

## Features

- ✅ **AI Commit Messages** — Smart commit message generation with context
- ✅ **Quality Gates** — Prevents tech debt (security, code smells, test coverage)
- ✅ **Context-Aware AI** — Learns your team's conventions and patterns
- ✅ **MCP Server** — Expose git intelligence to other AI agents (Claude, Windsurf, etc.)
- ✅ **PR Descriptions** — Generate pull request descriptions automatically
- ✅ **Code Documentation** — Generate docs from code
- ✅ **Branch Intelligence** — AI-powered branch management
- ✅ **Conflict Resolution** — AI assistance for merge conflicts
- ✅ **Code Review** — Automated quality review with AI

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Smart commit with AI-generated message
npm start -- commit

# Commit with quality gates (strict mode)
npm start -- commit --strict

# Commit without quality warnings
npm start -- commit --lax

# Show repository status
npm start -- status

# Generate PR description
npm start -- pr

# Analyze code
npm start -- analyze
```

## MCP Integration

GitPulse is now an MCP (Model Context Protocol) server. Configure it in Windsurf, Claude Desktop, or other MCP-compatible tools:

```json
{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": ["-y", "pulse", "mcp", "start"]
    }
  }
}
```

**Available MCP Tools:**
- `analyze_repo` — Repository health and metrics
- `suggest_commit` — AI commit message generation
- `review_changes` — Quality review of staged changes

## Quality Gates

GitPulse automatically checks your code before committing:

- **Security Scan** — Hardcoded secrets, SQL injection, XSS, path traversal
- **Code Smells** — Long functions, TODO/FIXME, console.log, debugger
- **Test Coverage** — Missing tests for changed files
- **Documentation** — Missing JSDoc on exports

```bash
# Normal mode (shows warnings)
pulse commit

# Strict mode (blocks commit on failures)
pulse commit --strict

# Lax mode (hides warnings)
pulse commit --lax
```

## Context-Aware Intelligence

GitPulse learns your team's conventions:

- Analyzes commit history for patterns
- Detects naming conventions (camelCase, PascalCase, etc.)
- Identifies architectural boundaries
- Finds file relationships (co-changes)
- Saves to `.gitpulse/conventions.json`
- Injects context into AI prompts

## Documentation

All project documentation is consolidated in `/docs/`:

- **`docs/project_memory.md`** — Primary source of truth (read this first)
- **`docs/architecture.md`** — System design and modules
- **`docs/dev_log.md`** — Development history
- **`docs/mcp-integration-complete-summary.md`** — MCP implementation details
- **`docs/phase-b-quality-gates-summary.md`** — Quality gates documentation
- **`docs/agent.md`** — AI usage instructions

## Configuration

```bash
# AI Provider (ollama, openrouter, openai, google, groq)
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Commit style (conventional, semantic, simple)
COMMIT_STYLE=conventional
```

## Vision

Stop context-switching to write docs. Let AI handle documentation while you code. GitPulse understands your codebase context, your team's conventions, and your project history to generate accurate, consistent documentation across your entire workflow.

**Phase 5 Complete:** GitPulse is now an MCP server with quality gates and context-aware intelligence, preventing AI-generated tech debt and ensuring your commits follow team conventions.

## Tech Stack

- **TypeScript** — CLI with rich terminal UI
- **Ink** — React-based terminal UI framework
- **MCP SDK** — Model Context Protocol server
- **Multi-model AI** — OpenRouter, Ollama, OpenAI, Google, Groq support
