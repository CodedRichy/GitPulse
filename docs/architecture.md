# GitPulse Architecture

## System Design

GitPulse is a TypeScript CLI application that uses Ink (React for terminal) to provide an interactive terminal UI. The application integrates with multiple AI providers to generate commit messages, PR descriptions, and code documentation. It also serves as an MCP (Model Context Protocol) server, exposing git intelligence to other AI agents.

### Core Principles

- **Local-First**: Code never leaves the local machine when using local AI models
- **Multi-Provider**: Support for Ollama, OpenRouter, OpenAI, Google, Groq
- **Context-Aware**: Understands codebase context and team conventions
- **Learning**: Adapts to user preferences over time
- **Quality-First**: Quality gates prevent tech debt before commits
- **MCP-Enabled**: Exposes git intelligence via MCP protocol

## Module Structure

```
GitPulse v3.1.0 (TypeScript + Ink + MCP)
├── src/
│   ├── index.ts              # CLI entry point
│   ├── components/           # React Ink UI components
│   ├── core/                 # Git operations & models
│   │   ├── quality-gates.ts  # Quality gates engine
│   │   ├── convention-learner.ts # Context-aware intelligence
│   │   ├── branch-intelligence.ts # Branch management
│   │   ├── code-review.ts    # Code review automation
│   │   └── issue-tracker.ts  # Issue tracker integration
│   ├── mcp/                  # MCP server
│   │   ├── server.ts         # MCP server with stdio transport
│   │   └── index.ts          # MCP entry point
│   ├── ai/                   # AI provider integrations
│   ├── commands/             # CLI commands
│   └── utils/                # Configuration & helpers
├── web/                      # Next.js web dashboard
│   ├── app/                  # Next.js app router
│   │   ├── api/              # API routes
│   │   │   ├── auth/github/  # GitHub OAuth
│   │   │   ├── session/      # Session management (JWT)
│   │   │   ├── settings/     # User settings
│   │   │   ├── health/       # Health check endpoint
│   │   │   ├── analytics/    # Local CLI analytics
│   │   │   ├── telemetry/    # Cloud telemetry sync (CLI→Cloud)
│   │   │   ├── stats/        # Productivity stats aggregation
│   │   │   ├── keys/         # API key management
│   │   │   └── support/      # Support tickets
│   │   ├── dashboard/        # Dashboard page
│   │   ├── profile/          # User profile
│   │   ├── settings/         # Settings page
│   │   └── login/            # Login page
│   ├── components/           # React components
│   │   ├── navbar.tsx         # Navigation
│   │   ├── footer.tsx         # Footer
│   │   ├── error-boundary.tsx # React error boundary
│   │   ├── charts.tsx         # Analytics charts
│   │   └── activity-heatmap.tsx # GitHub-style contribution graph
│   ├── lib/                  # Utility libraries
│   │   ├── jwt.ts            # JWT token handling
│   │   ├── rate-limit.ts     # API rate limiting
│   │   ├── csrf.ts           # CSRF protection
│   │   ├── validation.ts     # Input validation
│   │   ├── realtime.ts       # Supabase Realtime client
│   │   ├── supabase.ts        # Supabase client
│   │   └── tier.ts           # Tier/access control
│   └── hooks/                # React hooks
│       └── useRealtimeUser.ts # Real-time user data
├── dist/                     # Compiled output
└── docs/                     # Documentation
```

## Component Responsibilities

### `src/index.ts`
- CLI entry point
- Command routing and argument parsing
- Application initialization

### `src/components/`
React Ink UI components for terminal interface:

- **App.tsx**: Main application component
- **CommitWizard.tsx**: Interactive commit message generation workflow
- **StatusPanel.tsx**: Repository status display with diff preview
- **ConfigPanel.tsx**: Configuration management UI
- **ExplainView.tsx**: File history explanation interface
- **PRGenerator.tsx**: PR description generation interface
- **Analyzer.tsx**: Code analysis and documentation coverage display

### `src/core/`
Core business logic:

- **git.ts**: Git operations (status, diff, commit, history, undo/redo)
- **models.ts**: Data models and types
- **quality-gates.ts**: Quality gates engine
  - Security scan (secrets, SQL injection, XSS)
  - Code smells detection (long functions, TODOs, console.log)
  - Test coverage validation
  - Documentation checks
- **convention-learner.ts**: Context-aware intelligence
  - Analyzes commit history for patterns
  - Detects naming conventions
  - Identifies architectural boundaries
  - Finds file relationships (co-changes)
- **branch-intelligence.ts**: AI-powered branch management
- **code-review.ts**: Code review automation with static analysis + AI
- **issue-tracker.ts**: Issue tracker integration (GitHub/Linear/Jira)
- **telemetry.ts**: Local telemetry tracking (JSONL storage)
- **cloud-sync.ts**: Cloud sync to web dashboard
  - Auto-syncs quality gate runs to Supabase
  - API key authentication
  - Offline-fallback (local-first)

### `src/ai/`
AI provider integrations:

- **providers.ts**: Multi-provider AI client (Ollama, OpenRouter, OpenAI)
- **learning.ts**: Real-time learning from user corrections
- **prompts.ts**: Prompt templates (planned)

### `src/core/auth.ts`
Authentication and database:

- **TokenStorage**: Supabase-based token storage with RLS
- **AccountService**: Supabase Auth for email/password login, token refresh, logout

### `web/lib/` (Security Infrastructure)
Web dashboard security and utilities:

- **jwt.ts**: JWT token generation and verification for secure sessions
- **rate-limit.ts**: In-memory rate limiting for API endpoints (10 req/15min per IP)
- **csrf.ts**: CSRF protection utilities for state-changing requests
- **validation.ts**: Input validation helpers (email, UUID, GitHub username, etc.)
- **env-validation.ts**: Environment variable validation at startup
- **realtime.ts**: Supabase Realtime client for live data sync
- **supabase.ts**: Supabase client configuration
- **tier.ts**: Tier-based access control and feature flags

### `web/hooks/`
React hooks for state management:

- **useRealtimeUser.ts**: Real-time user data subscription with WebSocket sync

### `src/mcp/`
MCP (Model Context Protocol) server:

- **server.ts**: MCP server implementation
  - Tool handlers: analyze_repo, suggest_commit, review_changes
  - Resource handlers: repo://status, repo://config
  - Stdio transport for CLI integration
- **index.ts**: MCP server entry point

### `src/commands/`
CLI command implementations:

- **index.ts**: Command registry and router
- **mcp.ts**: MCP server command (start, config)
- **branch.ts**: Branch management commands
- **review.ts**: Code review commands
- **resolve.ts**: Conflict resolution commands
- **test.ts**: Test coverage commands
- **issues.ts**: Issue tracker commands
- **init.ts**: Project initialization

### `src/utils/`
Utility functions:

- **config.ts**: Configuration management
- **history.ts**: Commit history tracking
- **settings.ts**: User settings persistence
- **context.ts**: Multi-file context gathering

### `web/`
Next.js web dashboard for team analytics (separate project):

- **app/**: Next.js app router pages
- **lib/**: Shared utilities and Supabase client
- **public/**: Static assets

## Data Flow

### Commit Message Generation (with Quality Gates & Context-Awareness)
```
1. User runs: pulse commit
2. CLI checks git repository status
3. Quality gates run on staged changes:
   - Security scan (secrets, SQL injection, XSS)
   - Code smells (long functions, TODOs, console.log)
   - Test coverage check
   - Documentation validation
4. Convention learner analyzes repo:
   - Extracts naming patterns
   - Identifies commit patterns
   - Detects architectural boundaries
5. Context is built from:
   - File changes
   - Past commit history
   - Team conventions (learned)
   - Quality gate results
6. AI provider analyzes changes with context
7. AI generates commit message using team conventions
8. User reviews and edits (optional)
9. Commit is created
10. Learning system stores user corrections
```

### PR Description Generation
```
1. User runs: gitpulse pr
2. CLI fetches commit history for branch
3. AI analyzes:
   - All commits in PR
   - File changes
   - Impact analysis
4. AI generates comprehensive PR description:
   - Summary
   - Detailed changes
   - Testing checklist
   - Breaking changes
   - Related issues
5. User reviews and edits
6. Output to clipboard or file
```

### Code Documentation Generation
```
1. User runs: gitpulse doc <file>
2. CLI reads file content
3. AST parser extracts:
   - Functions
   - Classes
   - Dependencies
4. AI analyzes code structure
5. AI generates documentation:
   - File overview
   - Function descriptions
   - Parameter documentation
   - Usage examples
6. User reviews and edits
7. Documentation inserted into file
```

### MCP Server Communication
```
1. External AI agent (Windsurf, Claude Desktop) calls MCP tool
2. MCP server receives request via stdio
3. Server routes to appropriate tool handler:
   - analyze_repo: Git operations and health checks
   - suggest_commit: AI commit message generation
   - review_changes: Quality review of staged changes
4. Tool executes using GitPulse core modules
5. Result returned as JSON to AI agent
6. AI agent uses result in its workflow
```

## Component Interaction

```
┌─────────────┐
│   index.ts  │ (CLI Entry)
└──────┬──────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
┌──────▼──────┐                   ┌──────────▼─────────┐
│  commands/  │                   │      components/   │
│             │                   │                    │
│ - commit    │──────────────────►│ - CommitWizard     │
│ - mcp       │                   │ - StatusPanel      │
│ - branch    │──────────────────►│ - ExplainView      │
│ - review    │──────────────────►│ - PRGenerator      │
│ - init      │──────────────────►│ - ConfigPanel      │
└──────┬──────┘                   └──────────┬─────────┘
       │                                     │
       │                                     │
┌──────▼──────┐                   ┌──────────▼─────────┐
│   core/     │◄──────────────────│                    │
│             │                   │                    │
│ - git.ts    │                   │                    │
│ - models.ts │                   │                    │
│ - quality   │                   │                    │
│ - convention│                   │                    │
│ - branch    │                   │                    │
│ - review    │                   │                    │
└──────┬──────┘                   └────────────────────┘
       │
       │
┌──────▼──────┐
│     ai/     │
│             │
│ - providers │◄──────► AI APIs (Ollama, OpenRouter, OpenAI, Google, Groq)
│ - learning  │
└──────┬──────┘
       │
       │
┌──────▼──────┐
│    mcp/     │
│             │
│ - server    │◄──────► External AI Agents (Windsurf, Claude Desktop)
└─────────────┘
```

## Configuration Management

Configuration is stored in:
- `.env` file for AI provider settings
- `.gitpulse/config.json` for project-specific settings
- `.gitpulse/conventions.json` for learned team conventions
- Local cache for learned patterns
- `.gitpulse/history.json` for commit history

## Integration Points

### Git Integration
- Uses `simple-git` library for Git operations
- Supports all Git workflows (feature branches, PRs, etc.)

### AI Provider Integration
- **Ollama**: Local models, zero cost, privacy-first
- **OpenRouter**: Cloud models, multiple options
- **OpenAI**: GPT models for advanced features
- **Google**: Gemini models
- **Groq**: Fast inference models

### MCP Integration
- **Windsurf**: AI-powered IDE integration
- **Claude Desktop**: Anthropic's desktop app
- **Other MCP-compatible tools**: Any tool supporting MCP protocol

### Future Integrations
- **GitHub/GitLab API**: PR automation, issue linking
- **Linear/Jira**: Issue tracker integration
- **VSCode Extension**: IDE integration
- **GitHub Actions**: CI/CD automation

## Technology Choices

### TypeScript
- Type safety for complex CLI logic
- Better IDE support and autocomplete
- Easier refactoring and maintenance

### Ink (React for Terminal)
- Component-based UI architecture
- Reusable UI components
- Hot reload in development
- Familiar React patterns

### simple-git
- Reliable Git operations
- Cross-platform support
- Promise-based API
- Comprehensive Git feature coverage

### MCP SDK
- Standard protocol for AI tool integration
- Stdio transport for CLI compatibility
- Tool and resource handlers
- Support for multiple AI agents

## Security Considerations

- API keys stored in `.env` (never committed)
- Code never leaves local machine with Ollama
- Quality gates automatically scan for security issues:
  - Hardcoded secrets detection
  - SQL injection vulnerability detection
  - XSS vulnerability detection
  - Path traversal detection
- Pattern matching for secret detection
- Strict mode blocks commits with security issues

## Performance Optimization

- Lazy loading of AI providers
- Caching of AI responses
- Async operations for non-blocking UI
- Minimal dependencies for fast startup
- Convention caching (`.gitpulse/conventions.json`) to avoid re-analysis
- Quality gate incremental scanning (only changed files)
- MCP server stdio transport for low-latency communication
