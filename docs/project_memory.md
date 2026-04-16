# GitPulse - Project Memory

## Project Overview

**Name:** GitPulse  
**Purpose:** Guardrails for AI-Assisted Development — Quality gates and convention enforcement for teams using AI coding tools.  
**Vision:** Ensure every AI-generated commit meets your team's standards. GitPulse runs as pre-commit hooks and MCP server, providing quality gates, convention learning, and git intelligence to teams using Cursor, Copilot, Claude Code, and other AI coding assistants.

## Current Status

**Phase:** Phase 6 - Strategic Pivot & Foundation Reset
**Status:** Strategic review completed (2026-04-15). Pivoting from consumer "Grammarly for Code" to team governance infrastructure. Addressing critical technical debt.

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

**Web Dashboard - Production Security (2026-04-16):**
- ✅ **JWT Session Encryption** - Replaced insecure base64 with cryptographically secure JWT tokens
- ✅ **Rate Limiting** - API endpoints protected (10 req/15min per IP to prevent abuse)
- ✅ **Input Validation** - All API endpoints validate user input to prevent injection attacks
- ✅ **Secure JWT Secret** - 512-bit cryptographically random key generated
- ✅ **Cookie-Based Sessions** - Login page migrated from localStorage to HTTP-only cookies
- ✅ **Health Check Endpoint** - `/api/health` for monitoring and uptime checks
- ✅ **Real-Time Sync** - Supabase Realtime integration for live user data updates
  - Settings page auto-updates when tier changes
  - Profile page uses real-time user data
  - WebSocket-based PostgreSQL change notifications

**CLI-to-Cloud Telemetry Sync (2026-04-16):**
- ✅ **Local-to-Cloud Architecture** - Claude Code-style flow: CLI primary, web secondary
- ✅ **Auto-Sync** - Quality gate runs sync to cloud after each commit (non-blocking)
- ✅ **API Keys** - Secure bcrypt-hashed keys for CLI authentication
- ✅ **Cloud Telemetry Table** - Supabase `telemetry_runs` with RLS policies
- ✅ **CLI Sync Module** - `src/core/cloud-sync.ts` with offline-fallback

**Productivity Analytics (2026-04-16):**
- ✅ **Activity Heatmap** - GitHub-style contribution graph showing daily commits
- ✅ **AI Commit Tracking** - Count of AI-assisted vs manual commits
- ✅ **Quality Metrics** - Average score, pass rate, issues caught
- ✅ **Time Estimates** - Hours saved by using AI (2 min per commit)
- ✅ **Streak Tracking** - Current and longest commit streaks
- ✅ **Stats API** - `/api/stats` for real-time productivity aggregation

### Planned (Future - Phase 6+)

**Phase 6: Foundation Reset (Immediate Priority)**
- ⏳ Delete dead script files from src/ (7 files, ~21KB)
- ⏳ Add test coverage for core modules (quality-gates, convention-learner, providers)
- ⏳ Fix version consistency (package.json 3.0.0 → 3.1.0)
- ⏳ Set up CI/CD pipeline (.github/workflows/)
- ⏳ Remove `any` types from MCP server
- ⏳ Add .gitpulse.yml configuration for convention rules
- ⏳ Publish to npm with `npx gitpulse init` for hook installation

**Phase 7: Distribution & MCP Expansion**
- ⏳ GitHub Action for CI quality gate integration
- ⏳ Expand MCP tools from 3 to 10+ (semantic search, branch naming, PR templates, risk scoring)
- ⏳ VSCode extension for inline quality gate results
- ⏳ Convention learning v2 (ML-backed, not heuristic)

**Phase 8: Team & Revenue**
- ⏳ Team dashboard for org-wide convention adherence and quality trends
- ⏳ Supabase team sync for sharing conventions across members
- ⏳ Convention marketplace for sharing/importing rule packs

## Tech Stack

- **TypeScript** — CLI with rich terminal UI
- **Ink** — React-based terminal UI framework (Claude Code style)
- **simple-git** — Git operations
- **Multi-model AI** — OpenRouter, Ollama, OpenAI support
- **Next.js** — Web dashboard (in web/ directory)
- **Supabase** — Authentication, database, and real-time sync
- **JWT** — Secure session token encryption (jsonwebtoken)
- **@supabase/realtime-js** — Real-time database subscriptions

## Architecture Overview

GitPulse v3.1.0 (TypeScript + Ink + MCP)

```
src/
├── index.ts              # CLI entry point
├── components/           # React Ink UI components
│   ├── App.tsx
│   ├── CommitWizard.tsx  # Commit with quality gates + conventions
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
│   ├── models.ts
│   ├── quality-gates.ts  # Quality gates engine (Phase 5)
│   ├── convention-learner.ts # Context-aware intelligence (Phase 5)
│   ├── branch-intelligence.ts # Branch management
│   ├── code-review.ts    # Code review automation
│   ├── issue-tracker.ts  # Issue tracker integration
│   └── auth.ts           # Supabase authentication and token management
├── ai/                   # AI provider integrations
│   ├── providers.ts      # OpenRouter, Ollama, Google, Groq
│   ├── learning.ts       # Real-time learning from corrections
│   ├── model-selector.ts # Auto model selection
│   └── model-tester.ts   # Model testing and benchmarking
├── mcp/                  # MCP server (Phase 5)
│   ├── server.ts         # MCP server with stdio transport
│   └── index.ts          # MCP entry point
├── utils/                # Configuration & helpers
│   ├── config.ts         # Config management with model aliases
│   ├── history.ts        # Commit history tracking
│   ├── settings.ts       # User settings persistence
│   └── context.ts        # Multi-file context gathering
└── commands/             # CLI commands
    ├── index.ts          # Command registry
    ├── mcp.ts            # MCP command
    ├── branch.ts         # Branch management
    ├── review.ts         # Code review
    ├── resolve.ts        # Conflict resolution
    ├── test.ts           # Test coverage
    ├── issues.ts         # Issue tracker
    └── init.ts           # Initialization

web/                      # Next.js web dashboard
├── app/                  # Next.js app router
│   ├── api/              # API routes
│   │   ├── auth/github/  # GitHub OAuth
│   │   ├── session/      # Session management (JWT)
│   │   ├── settings/     # User settings
│   │   ├── health/       # Health check endpoint
│   │   └── analytics/    # Analytics data
│   ├── dashboard/        # Dashboard page
│   ├── profile/          # User profile with real-time sync
│   ├── settings/         # Settings page with real-time sync
│   └── login/            # Login page (cookie-based auth)
├── components/           # React components
│   ├── navbar.tsx         # Navigation with auth state
│   ├── footer.tsx         # Footer component
│   ├── error-boundary.tsx # React error boundary
│   └── charts.tsx         # Analytics charts
├── lib/                  # Utility libraries
│   ├── jwt.ts            # JWT token generation/verification
│   ├── rate-limit.ts     # API rate limiting
│   ├── csrf.ts           # CSRF protection utilities
│   ├── validation.ts     # Input validation helpers
│   ├── env-validation.ts # Environment variable validation
│   ├── realtime.ts       # Supabase Realtime client
│   ├── supabase.ts        # Supabase client
│   └── tier.ts           # Tier/access control logic
└── hooks/                # React hooks
    └── useRealtimeUser.ts # Real-time user data subscription
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
- `logout` — Sign out of Supabase account

### Authentication
- **Supabase Auth** - Email/password authentication via Supabase
- **GitHub OAuth** - OAuth flow for web dashboard (in web/app/auth/github)
- **JWT Session Tokens** - Secure HTTP-only cookie-based sessions with JWT encryption
- **Token Storage** - Tokens stored in Supabase `auth_tokens` table (CLI) and HTTP-only cookies (web)
- **Auto-refresh** - Tokens automatically refreshed when expired
- **Web Login** - GitHub OAuth for web dashboard (in web/app/login)
- **CLI Login** - Email/password login for CLI (in src/components/Login)

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

### Critical Technical Debt (Identified 2026-04-15)

**🔴 Zero Test Coverage**
- No test files in the entire project
- Quality gates and convention learner have no unit tests
- Critical for a tool that promotes code quality
- **Action Required:** Add tests for quality-gates.ts, convention-learner.ts, providers.ts before shipping new features

**✅ RESOLVED - Web Folder Cleanup (2026-04-16)**
- Deleted unused files: `csrf.ts`, `realtime.ts`, `useRealtimeUser.ts`
- Removed dead functions from `tier.ts` and `validation.ts`
- Cleaned empty `pricing/` directory and default Next.js SVG assets

**✅ RESOLVED - Dead Code Cleanup (2026-04-16)**
- 7 temporary script files from refactoring sessions already deleted:
  - `clean_imports.ts`, `fix_input.ts`, `fix_login_compile.ts`
  - `replace_use_app.ts`, `update_exit.ts`, `update_login.ts`, `update_welcome.ts`
- `src/ai/model-tester.ts` (842 lines) - deleted, was unused
- **Note:** Files were already removed from codebase

**🔴 No CI/CD Pipeline**
- No `.github/workflows/` directory
- No build verification, lint, or type-check in CI
- PRs could break build without detection
- **Action Required:** Set up GitHub Actions workflow

**🟠 Version Mismatch**
- `package.json` says `3.0.0` but docs claim `3.1.0`
- **Action Required:** Update package.json to 3.1.0

**🟠 Type Safety Issues**
- MCP server uses `args: any` extensively (server.ts:168, 200, 269)
- `calculateHealthScore(status: any)` defeats TypeScript purpose
- **Action Required:** Add proper type definitions

**🟠 No Configuration Override**
- Convention learning is fully automatic with no manual override
- Teams need explicit rule configuration capability
- **Action Required:** Add `.gitpulse.yml` for convention rules

**🟠 Web Dashboard is Incomplete** (PARTIALLY RESOLVED 2026-04-16)
- ✅ GitHub OAuth authentication working
- ✅ Settings page functional with real-time updates
- ✅ Profile page with real-time sync
- ✅ Dashboard page with analytics display
- ✅ Production security hardening (JWT, rate limiting, validation)
- ⏳ Team dashboard for org-wide analytics
- ⏳ Subscription/payment integration

### Architecture Issues

**Monorepo Structure Needed**
- CLI and web app share zero code despite both being TypeScript
- Should move to proper monorepo with shared core package

**Plugin Architecture for Quality Gates**
- Current hardcoded gate registration doesn't scale
- Need plugin system for custom team rules

**Streaming AI Responses**
- All AI providers use `stream: false`
- Should stream tokens for better perceived performance

**Error Handling**
- 30+ empty catch blocks silently swallow errors
- Should log to debug file at minimum

**Prompt Templates**
- Prompts hardcoded inline (CommitWizard.tsx, mcp/server.ts)
- Should extract to `prompts/` directory for versioning and testing

## Current Focus

**Immediate Priority:** Phase 6 - Foundation Reset
- Delete dead script files (7 files in src/)
- Add test coverage for core modules
- Fix version consistency (3.0.0 → 3.1.0)
- Set up CI/CD pipeline
- Remove `any` types from codebase
- Add .gitpulse.yml configuration
- Publish to npm with hook installation

## Strategic Positioning

**Old Positioning:** "Grammarly for Code" — AI writes your commit messages
**New Positioning:** "Guardrails for AI-Assisted Development" — Quality gates and convention enforcement for teams

**Rationale:**
- AI commit message generation is now table stakes (Copilot, Cursor, Windsurf)
- Differentiator is governance: quality gates, convention enforcement, pre-commit hooks
- Plays WITH AI coding tools, not against them
- Addresses real pain: teams worried about AI-generated code quality
- Revenue opportunity in team dashboard ($10-15/seat/month) vs individual developer tool

## Next Steps

1. Delete dead script files from src/
2. Add unit tests for quality-gates.ts and convention-learner.ts
3. Set up GitHub Actions CI/CD pipeline
4. Update package.json version to 3.1.0
5. Remove `any` types from MCP server
6. Add .gitpulse.yml configuration support
7. Implement pre-commit/commit-msg hook installation via `gitpulse init`
8. Publish to npm

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

### Phase 5: MCP Integration & Quality Gates ✅ Complete
- ✅ MCP server with 3 tools (analyze_repo, suggest_commit, review_changes)
- ✅ Quality gates engine (security, smells, coverage, documentation)
- ✅ Convention learner for team pattern detection
- ✅ Context-aware AI prompts

### Phase 6: Foundation Reset (Current)
- ⏳ Delete dead script files
- ⏳ Add test coverage
- ⏳ Set up CI/CD
- ⏳ Fix version consistency
- ⏳ Remove `any` types
- ⏳ Add .gitpulse.yml config
- ⏳ npm publish with hook installation

### Phase 6.5: Web Security (Complete 2026-04-16)
- ✅ JWT session encryption
- ✅ Rate limiting on API endpoints
- ✅ Input validation
- ✅ Secure JWT secret
- ✅ Cookie-based sessions
- ✅ Health check endpoint
- ✅ Real-time sync via Supabase Realtime

### Phase 7: Distribution & MCP Expansion (Planned)
- ⏳ GitHub Action for CI integration
- ⏳ Expand MCP tools to 10+
- ⏳ VSCode extension
- ⏳ Convention learning v2 (ML-backed)

### Phase 8: Team & Revenue (Planned)
- ⏳ Team dashboard
- ⏳ Supabase team sync
- ⏳ Convention marketplace

## Research

Detailed AI model research and benchmarks available in `/docs/research/ai-models.md`

## Archived Plans

Detailed implementation plans archived in `/docs/archive/`:
- `grammarly-for-code-plan.md` — Product positioning and GTM strategy
- `implementation-plan.md` — Detailed feature implementation phases
