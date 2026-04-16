# GitPulse

**AI-Powered Guardrails for Git Workflows** — Quality gates, convention enforcement, and intelligent commit automation for developers using Copilot, Cursor, Windsurf, or Claude Code.

**v3.1.0** — Quality Gates · Convention Learning · MCP Integration · Web Dashboard

[![CI](https://github.com/CodedRichy/GitPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/CodedRichy/GitPulse/actions)

---

## Overview

GitPulse sits between your AI coding tools and your git history, ensuring every commit meets your team's standards. It acts as a guardrail that catches issues before they enter your codebase.

**Problem it solves:**
- AI tools generate code fast — but also generate inconsistent commits, skip tests, leak secrets, and ignore team conventions
- Manual code review catches issues too late (after commit/push)
- Teams lack automated enforcement of quality standards

**Target users:**
- Development teams using AI coding assistants (Copilot, Cursor, Windsurf, Claude Code)
- Tech leads wanting to enforce code quality standards
- Individual developers seeking better git workflows

---

## Features

### Quality Gates
- **Security Scan** — Detects hardcoded secrets, SQL injection, XSS, path traversal
- **Code Smells** — Flags long functions, TODO/FIXME markers, console.log, debugger statements
- **Test Coverage** — Identifies missing test files for changed code
- **Documentation** — Validates JSDoc on exported functions

### AI-Powered Automation
- **Smart Commits** — AI-generated commit messages following team conventions
- **PR Descriptions** — Auto-generated comprehensive PR descriptions with testing checklists
- **Code Documentation** — AI-generated documentation for undocumented functions
- **Conflict Resolution** — AI-assisted merge conflict resolution

### Convention Learning
- Analyzes commit history to detect team patterns
- Identifies naming conventions (camelCase, PascalCase, etc.)
- Discovers architectural boundaries and file relationships
- Adapts suggestions based on learned preferences

### MCP Server Integration
- Exposes git intelligence via Model Context Protocol (MCP)
- Works with Claude Desktop, Windsurf, Cursor, and other MCP-compatible tools
- Tools: `analyze_repo`, `suggest_commit`, `review_changes`

### Web Dashboard (Pro/Team)
- Next.js-based analytics dashboard
- GitHub OAuth authentication
- Quality gate run history and metrics
- API key management for cloud sync

---

## Architecture

### High-Level Components

```
GitPulse
├── CLI Application (TypeScript + Ink)
│   ├── Commands (commit, review, branch, etc.)
│   ├── Core Engine (quality gates, git operations)
│   ├── AI Providers (Ollama, OpenRouter, OpenAI, Google, Groq)
│   └── MCP Server (stdio transport)
│
├── Web Dashboard (Next.js + Supabase)
│   ├── Authentication (GitHub OAuth, JWT)
│   ├── API Routes (analytics, settings, telemetry)
│   └── React Components (charts, heatmaps)
│
└── GitHub Action
    └── Quality gates for CI/CD pipelines
```

### Data Flow

1. **Commit Workflow:**
   ```
   User runs 'gitpulse commit'
   → Quality gates scan staged changes
   → Convention learner extracts team patterns
   → AI analyzes changes with context
   → Commit message generated
   → User reviews and commits
   → Learning system stores corrections
   ```

2. **MCP Integration:**
   ```
   External AI agent calls MCP tool
   → MCP server routes to handler
   → GitPulse core executes
   → Results returned as JSON
   → AI agent uses in workflow
   ```

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Language** | TypeScript 5.3+ |
| **CLI Framework** | Ink (React for Terminal), meow |
| **Web Framework** | Next.js 16, React 19 |
| **Styling** | Tailwind CSS 4 |
| **Database** | Supabase (PostgreSQL + Auth) |
| **AI Providers** | Ollama, OpenRouter, OpenAI, Google (Gemini), Groq |
| **Git Operations** | simple-git |
| **Testing** | Vitest |
| **CI/CD** | GitHub Actions |
| **MCP Protocol** | @modelcontextprotocol/sdk |
| **AST Parsing** | @babel/parser, @babel/traverse |

---

## Repository Structure

```
GitPulse/
├── src/                      # CLI source code
│   ├── index.ts              # CLI entry point
│   ├── commands/             # CLI command implementations
│   ├── components/           # Ink React UI components
│   ├── core/                 # Core business logic
│   │   ├── git.ts            # Git operations
│   │   ├── quality-gates.ts  # Quality gates engine
│   │   ├── convention-learner.ts  # Pattern detection
│   │   ├── branch-intelligence.ts # Branch management
│   │   ├── code-review.ts    # AI code review
│   │   └── issue-tracker.ts  # GitHub/Linear/Jira integration
│   ├── ai/                   # AI provider integrations
│   │   ├── providers.ts      # Multi-provider client
│   │   └── learning.ts       # User preference learning
│   ├── mcp/                  # MCP server
│   │   ├── server.ts         # MCP server implementation
│   │   └── index.ts          # MCP entry point
│   └── utils/                # Configuration & helpers
│
├── web/                      # Next.js web dashboard
│   ├── app/                  # Next.js app router
│   │   ├── api/              # API routes (auth, analytics, settings)
│   │   ├── dashboard/        # Dashboard page
│   │   └── settings/         # Settings page
│   ├── components/           # React components
│   └── lib/                  # Utilities (JWT, rate-limit, validation)
│
├── action/                   # GitHub Action
│   ├── index.ts              # Action entry point
│   └── format-comment.ts     # PR comment formatting
│
├── docs/                     # Documentation
│   ├── architecture.md       # System architecture
│   ├── project_memory.md     # Project decisions & context
│   └── dev_log.md            # Development log
│
├── dist/                     # Compiled CLI output
├── package.json              # CLI dependencies
├── tsconfig.json             # TypeScript configuration
└── vitest.config.ts          # Test configuration
```

---

## Installation

### Prerequisites
- Node.js 18+ 
- Git repository
- For local AI: Ollama installed (optional)

### CLI Installation

```bash
# Clone repository
git clone https://github.com/CodedRichy/GitPulse.git
cd GitPulse

# Install dependencies
npm install

# Build the CLI
npm run build

# Link for global access (optional)
npm link
```

### Environment Setup

Create `.env` file in project root:

```bash
# AI Provider Configuration
AI_PROVIDER=ollama              # Options: ollama, openrouter, openai, google, groq
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# For cloud providers (if not using Ollama)
OPENROUTER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here

# Commit Style
COMMIT_STYLE=conventional       # Options: conventional, semantic, simple
```

### Web Dashboard Setup (Optional)

```bash
cd web
npm install

# Create .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=random_secret_key

# Run development server
npm run dev
```

---

## Usage

### Initialize GitPulse

```bash
# Install git hooks and create config
gitpulse init
```

### Smart Commit

```bash
# Generate AI commit message with quality gates
gitpulse commit

# Strict mode — blocks on any quality issue
gitpulse commit --strict

# Lax mode — hides warnings
gitpulse commit --lax

# Dry run — preview without committing
gitpulse commit --dry-run
```

### Repository Status

```bash
# Show detailed repository status
gitpulse status
```

### Code Review

```bash
# Review staged changes
gitpulse review staged

# Review specific file
gitpulse review src/components/App.tsx
```

### Generate Documentation

```bash
# Generate documentation for file
gitpulse doc src/utils/helpers.ts

# Analyze documentation coverage
gitpulse analyze
```

### PR Description

```bash
# Generate PR description for current branch
gitpulse pr

# Dry run to preview
gitpulse pr --dry-run
```

### Branch Management

```bash
# List branches
gitpulse branch list

# Create feature branch with AI suggestion
gitpulse branch create

# AI-suggested branch name based on changes
gitpulse branch suggest
```

### MCP Server

```bash
# Start MCP server for AI agent integration
gitpulse mcp start
```

Configure in MCP-compatible tools:

```json
{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": ["-y", "gitpulse", "mcp", "start"]
    }
  }
}
```

### Web Dashboard (Pro/Team)

```bash
# Open web dashboard in browser
gitpulse dashboard

# Specify custom port
gitpulse dashboard --port 3001
```

---

## Configuration

### GitPulse Config (`.gitpulse/config.json`)

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
    "allowed_types": ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
    "auto_learn": true
  },
  "hooks": {
    "pre_commit": true,
    "commit_msg": true
  }
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_PROVIDER` | AI provider (ollama, openrouter, openai, google, groq) | Yes |
| `OLLAMA_HOST` | Ollama server URL | If using Ollama |
| `OLLAMA_MODEL` | Ollama model name | If using Ollama |
| `OPENROUTER_API_KEY` | OpenRouter API key | If using OpenRouter |
| `OPENAI_API_KEY` | OpenAI API key | If using OpenAI |
| `GROQ_API_KEY` | Groq API key | If using Groq |
| `GOOGLE_API_KEY` | Google AI API key | If using Google |
| `COMMIT_STYLE` | Commit message style (conventional, semantic, simple) | No (default: conventional) |

---

## Development

### Local Development

```bash
# Run CLI in development mode
npm run dev

# Run with hot reload
npm run dev -- commit

# Type check
npm run typecheck

# Build for production
npm run build
```

### Web Dashboard Development

```bash
cd web
npm run dev        # Start Next.js dev server
npm run build      # Build for production
npm run lint       # Run ESLint
```

### Code Style

- TypeScript strict mode enabled
- ESLint for linting
- Follow existing patterns in `src/` directory

---

## Testing

### Run Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:ci
```

### Test Structure

Tests are located alongside source files:
- `src/core/__tests__/` — Core functionality tests
- `src/mcp/__tests__/` — MCP server tests
- `action/__tests__/` — GitHub Action tests

### Test Framework

- **Vitest** — Unit testing framework
- **@vitest/coverage-v8** — Code coverage

---

## Deployment

### CLI Publishing

```bash
# Run full verification before publish
npm run prepublishOnly

# Publish to npm
npm publish
```

### Web Dashboard (Netlify)

```bash
cd web

# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

### GitHub Action

The GitHub Action is automatically available via the repository:

```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates
on: [pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: CodedRichy/GitPulse/action@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          strict: 'true'
```

---

## Roadmap

Based on codebase analysis and documentation:

### Near-term
- [ ] VSCode Extension for IDE integration
- [ ] GitHub/GitLab API integration for PR automation
- [ ] Additional AI provider support (Anthropic Claude API)
- [ ] Enhanced security scanning rules

### Future
- [ ] Team collaboration features in web dashboard
- [ ] Custom quality gate plugins
- [ ] Integration with Jira/Linear for issue linking
- [ ] Semantic versioning automation

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow conventional commit messages
- Add tests for new functionality
- Update documentation for API changes
- Ensure all quality gates pass before submitting PR

---

## License

Proprietary. Copyright (c) 2025 Rishi Praseeth Krishnan. All rights reserved.

Source code is visible for reference only. No license is granted for modification, distribution, or commercial use without express written permission.

See [LICENSE](LICENSE) for full terms.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/CodedRichy/GitPulse/issues)
- **Documentation:** [docs/](docs/)
- **Architecture:** [docs/architecture.md](docs/architecture.md)

---

<p align="center">Built with ❤️ for developers who care about code quality</p>
