# GitPulse

**Guardrails for AI-Assisted Development** — Quality gates, convention enforcement, and intelligent commit automation for teams using Copilot, Cursor, Windsurf, or Claude Code.

**v3.1.0 — Quality Gates · Convention Learning · MCP Integration**

[![CI](https://github.com/CodedRichy/GitPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/CodedRichy/GitPulse/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why GitPulse?

AI coding tools generate code fast — but they also generate inconsistent commits, skip tests, leak secrets, and ignore your team's conventions. GitPulse sits between your AI tools and your git history, ensuring every commit meets your standards.

- **Quality Gates** — Block commits with hardcoded secrets, SQL injection, XSS, and code smells
- **Convention Enforcement** — Learns your team's commit patterns and enforces them via git hooks
- **MCP Server** — Expose git intelligence to Claude, Windsurf, Cursor, and other AI agents
- **Multi-model AI** — Works with Ollama (local), OpenRouter, Google, Groq, OpenAI

## Quick Start

```bash
# Install dependencies
npm install

# Initialize in your repo (installs hooks automatically)
npm start -- init

# Smart commit with quality gates
npm start -- commit

# Strict mode — blocks on any quality issue
npm start -- commit --strict

# Show repository status
npm start -- status

# Generate PR description
npm start -- pr
```

## Quality Gates

GitPulse automatically checks your code before committing:

| Gate | What It Catches | Severity |
|------|----------------|----------|
| **Security Scan** | Hardcoded secrets, SQL injection, XSS, path traversal | Critical |
| **Code Smells** | Long functions, TODO/FIXME, console.log, debugger | High |
| **Test Coverage** | Missing test files for changed code | Medium |
| **Documentation** | Missing JSDoc on exported functions | Low |

```bash
# Normal mode (shows warnings)
pulse commit

# Strict mode (blocks commit on failures)
pulse commit --strict

# Lax mode (hides warnings)
pulse commit --lax
```

### Configuration

Quality gates and conventions are configured in `.gitpulse/config.json`:

```json
{
  "version": 1,
  "quality_gates": {
    "security-scan": { "enabled": true, "severity": "critical" },
    "code-smells": { "enabled": true, "severity": "high" },
    "test-coverage": { "enabled": true, "severity": "medium" },
    "documentation": { "enabled": true, "severity": "low" }
  },
  "conventions": {
    "commit_style": "conventional",
    "enforce_scope": false,
    "allowed_types": ["feat", "fix", "docs", "style", "refactor", "test", "chore", "ci", "perf", "build", "revert"],
    "auto_learn": true
  },
  "hooks": {
    "pre_commit": true,
    "commit_msg": true
  }
}
```

## Git Hooks

`gitpulse init` installs two hooks:

- **pre-commit** — Runs quality gates; exits non-zero to block commits with critical issues
- **commit-msg** — Validates commit message format against configured conventions

Skip hooks when needed: `git commit --no-verify`

## Context-Aware Intelligence

GitPulse learns your team's conventions:

- Analyzes commit history for patterns
- Detects naming conventions (camelCase, PascalCase, etc.)
- Identifies architectural boundaries
- Finds file relationships (co-changes)
- Saves to `.gitpulse/conventions.json`
- Injects context into AI prompts

## MCP Integration

GitPulse is an MCP (Model Context Protocol) server. Configure it in Windsurf, Claude Desktop, or other MCP-compatible tools:

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

## All Commands

```
gitpulse              # Open interactive menu
gitpulse commit       # AI-generated commit with quality gates
gitpulse status       # Repository status
gitpulse pr           # Generate PR description
gitpulse doc <file>   # Generate code documentation
gitpulse analyze      # Analyze documentation coverage
gitpulse explain <f>  # Explain file history
gitpulse review       # Code review with AI
gitpulse branch       # Branch management
gitpulse resolve      # AI conflict resolution
gitpulse init         # Initialize GitPulse + hooks
gitpulse config       # Manage settings
gitpulse mcp          # Start MCP server
```

## AI Provider Configuration

```bash
# AI Provider (ollama, openrouter, openai, google, groq)
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Commit style (conventional, semantic, simple)
COMMIT_STYLE=conventional
```

## Development

```bash
npm install       # Install dependencies
npm run dev       # Development with hot reload
npm run build     # Compile to dist/
npm run test      # Run tests
npm run typecheck # Type check
```

## Tech Stack

- **TypeScript** — CLI with Ink (React for terminal)
- **MCP SDK** — Model Context Protocol server
- **Vitest** — Unit testing
- **Multi-model AI** — OpenRouter, Ollama, OpenAI, Google, Groq
- **Next.js** — Web dashboard (in web/)
- **Supabase** — Authentication

## License

MIT
