# GitPulse - Project Memory

## Project Overview

**Name:** GitPulse  
**Purpose:** Guardrails for AI-Assisted Development — Quality gates and convention enforcement for teams using AI coding tools.  
**Vision:** Ensure every AI-generated commit meets your team's standards. GitPulse runs as pre-commit hooks and MCP server, providing quality gates, convention learning, and git intelligence to teams using Cursor, Copilot, Claude Code, and other AI coding assistants.

## Current Status

**Phase:** Phase 3 - Attestation & Beta (Code Complete) - Awaiting Beta Program Recruitment
**Status:** 2026-04-17 - All code phases complete (Phase 1: Surgical Hardening, Phase 2: The Governed Gate, Phase 3: Attestation & Beta). Code polishing complete. Ready for beta program recruitment.

**The Must-Have Vision:**
Every developer who uses AI to code should feel like GitPulse is as essential as their IDE. Not because compliance requires it, but because **it prevents embarrassing, career-damaging mistakes before they become permanent.**

**The "Oh Shit" Moments We Prevent:**
- "I just committed the production AWS keys to a public repo"
- "My commit message is 'fix stuff' and my CTO is reviewing it"
- "I pushed broken code and the CI pipeline failed"
- "I committed a console.log with user passwords"

**The Feeling:** "GitPulse just saved my ass. I almost leaked secrets / looked unprofessional / broke production."

### Completed Phases (2026-04-17)

**Phase 1: Surgical Hardening** ✅
- Git-Shield: Git state detection (rebase, merge, detached HEAD, unmerged files)
- Lockfile: Concurrency mutex preventing multiple GitPulse instances
- Test coverage for quality gates, git-shield, and lockfile
- Cleanup: Removed dead script files

**Phase 2: The Governed Gate** ✅
- Gitleaks integration for secret scanning with regex fallback
- Audit logbook: Local-first audit trail (.gitpulse/audit.json)
- Override with justification flow in CommitWizard
- gitpulse audit command to view history
- Pre-commit hook installation (gitpulse init)

**Phase 3: Attestation & Beta (Code Complete)** ✅
- Compliance report generator (Markdown format)
- gitpulse report command
- Scan history, override log, quality trends in reports

**Code Polishing** ✅
- .gitpulse.yml configuration support (YAML + JSON)
- CI/CD pipeline verification
- Package.json version 3.1.0

**Phase 3: Security Improvements** ✅
- reCAPTCHA v3 on support form
- CSRF protection with tokens and validation
- Comprehensive audit logging (API keys, config, settings, support tickets)

**Phase 4: Data Governance** ✅
- Data retention policies (90d telemetry, 365d tickets, 180d audit logs)
- GDPR compliance: data export and account deletion
- Sentry error tracking with session replay

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
  - `analyze_repo` - Repository health & metrics ✅ Working
  - `suggest_commit` - AI commit message generation ✅ Working
  - `review_changes` - Quality review of staged changes ✅ Working
  - `run_quality_gates` - Quality gates engine ✅ Working
  - `validate_commit_message` - Commit message validation ✅ Working
  - `get_conventions` - Team convention detection ✅ Working
  - `search_commit_history` - Git history search ✅ Working
  - `branch_info` - Branch status and info ✅ Working
  - `get_config` - GitPulse configuration ✅ Working
  - `analyze_file` - File complexity analysis ✅ Working
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

### Current Open Gaps (Post-Remediation Snapshot)

**🟠 MCP Server Test Expansion**
- Core MCP tools are working and verified.
- Dedicated, broader MCP server test coverage is still pending.
- **Action Required:** Add/expand MCP server tests for tool execution paths and auth flows.

**🟡 Config Validation Track (Near-complete)**
- Zod-based config validation is implemented and tested.
- Validation and merge behavior are passing current suites.
- **Action Required:** Finalize task tracking state and keep schema/docs aligned as config evolves.

**🟡 Product/Platform Work (Planned)**
- Team collaboration/dashboard expansion (Phase 8) remains planned.
- MCP tool and distribution expansion remain planned.

### Recently Resolved
- Test stability issues in git tests were fixed (`getCommitHistory` compatibility and cross-platform `getRepoRoot` normalization).
- Logger syntax corruption was fixed and test suite is green.
- Full test run status: **303/303 passing**.

## Current Focus

**Immediate Priority:** MCP server test expansion and stabilization.

**Secondary Focus:** Keep documentation/task tracking in sync with completed remediation work and test outcomes.

## Strategic Positioning

**Old Positioning:** "Grammarly for Code" — AI writes your commit messages
**New Positioning (v1):** "Guardrails for AI-Assisted Development" — Quality gates and convention enforcement for teams
**New Positioning (v2 - The Must-Have):** "The Oh Shit Prevention Layer" — Prevents embarrassing, career-damaging mistakes before they become permanent

**The Evolution:**
1. Started as "Grammarly for Code" (commodity feature)
2. Pivoted to "Guardrails for AI-Assisted Development" (compliance market)
3. **Current:** "The Oh Shit Prevention Layer" (developer love + compliance value)

**Rationale:**
- AI commit message generation is now table stakes (Copilot, Cursor, Windsurf)
- Compliance alone is a vitamin; preventing disasters is a painkiller
- Developers will USE it because it saves their ass
- Teams will MANDATE it because it provides audit trails
- Revenue opportunity: $20/user/year for "peace of mind + professional polish"

## Next Steps

1. Add dedicated MCP server tests (tool execution, error paths, auth middleware behavior).
2. Mark config validation task fully complete once tracking/docs are synced.
3. Continue Phase 7 distribution and MCP expansion work.
4. Begin Phase 8 team/revenue features after MCP test baseline is in place.

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
- ✅ Completed (core hardening, CI/CD, tests, logging, validation, auth and governance modules)

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
