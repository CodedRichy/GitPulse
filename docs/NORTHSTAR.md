# GitPulse — North Star Document

> **The definitive strategic and architectural reference for the GitPulse project**
>
> *Version:* 0.1.0 | *Last Updated:* April 18, 2026 (3:00 PM) | *Status:* Phase 1-8 Complete, Phase 9.1 Complete, Phase 9.2 UI Shells Complete

---

## 1. Vision & Mission

### The "Oh Shit" Prevention Layer

Every developer who uses AI to code should feel like GitPulse is as essential as their IDE. Not because compliance requires it, but because **it prevents embarrassing, career-damaging mistakes before they become permanent.**

**The Moments We Prevent:**
- "I just committed the production AWS keys to a public repo"
- "My commit message is 'fix stuff' and my CTO is reviewing it"
- "I pushed broken code and the CI pipeline failed"
- "I committed a console.log with user passwords"

**The Feeling:** *"GitPulse just saved my ass. I almost leaked secrets / looked unprofessional / broke production."*

### Mission Statement

To make AI-assisted development safer, more consistent, and higher quality by providing intelligent guardrails that catch issues at commit-time — not after they've entered the codebase.

### Core Value Proposition

| For Developers | For Teams | For Organizations |
|----------------|-----------|-------------------|
| Prevents embarrassing mistakes | Enforces quality standards automatically | Compliance audit trails |
| Saves time on commit messages | Consistent conventions across team | Security leak prevention |
| Catches issues before push | Code review automation | Quality metrics visibility |
| Learns personal preferences | Shared team intelligence | Reduced technical debt |

---

## 2. Product Overview

### What is GitPulse?

GitPulse is an AI-powered guardrail system for git workflows that sits between AI coding tools and git history. It provides:

1. **Quality Gates** — Automated scanning for security issues, code smells, test coverage, and documentation
2. **Intelligent Commits** — AI-generated commit messages that follow team conventions
3. **Convention Learning** — Automatic detection and enforcement of team patterns
4. **MCP Integration** — Exposes git intelligence to other AI agents via Model Context Protocol
5. **Web Dashboard** — Team analytics, quality metrics, and productivity insights

### The Problem We Solve

**Before GitPulse:**
- AI tools generate code fast but also generate inconsistent commits
- Teams skip tests, leak secrets, and ignore conventions
- Manual code review catches issues too late (after commit/push)
- No automated enforcement of quality standards

**With GitPulse:**
- Quality gates catch issues before they enter the codebase
- AI commits follow team conventions automatically
- Security scans prevent credential leaks
- Audit trails provide compliance visibility

### Target Users

1. **Primary:** Developers using AI coding assistants (Copilot, Cursor, Windsurf, Claude Code)
2. **Secondary:** Tech leads wanting to enforce code quality standards
3. **Tertiary:** Individual developers seeking better git workflows

---

## 3. Architecture & Technical Foundation

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GitPulse v0.1.0                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│  │    CLI      │    │  MCP Server │    │   Web App   │               │
│  │  (Ink/React)│◄──►│   (stdio)   │◄──►│  (Next.js)  │               │
│  └──────┬──────┘    └─────────────┘    └──────┬──────┘               │
│         │                                      │                        │
│         └──────────────┬───────────────────────┘                        │
│                        │                                                │
│              ┌─────────▼─────────┐                                     │
│              │    Core Engine      │                                     │
│              │  ┌─────────────┐   │                                     │
│              │  │ Quality Gates│   │                                     │
│              │  │ Convention   │   │                                     │
│              │  │   Learner    │   │                                     │
│              │  │ Git-Shield   │   │                                     │
│              │  │ Audit Logbook│   │                                     │
│              │  └─────────────┘   │                                     │
│              └─────────┬─────────┘                                     │
│                        │                                                │
│         ┌──────────────┼──────────────┐                                │
│         ▼              ▼              ▼                                │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                        │
│  │   Git    │   │    AI    │   │  Cloud   │                        │
│  │(simple-  │   │(Multi-   │   │(Supabase)│                        │
│  │  git)    │   │Provider) │   │          │                        │
│  └──────────┘   └──────────┘   └──────────┘                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
GitPulse/
├── src/                      # CLI source code
│   ├── index.ts              # CLI entry point
│   ├── components/           # Ink React UI components
│   │   ├── App.tsx
│   │   ├── CommitWizard.tsx  # Main commit flow
│   │   ├── StatusPanel.tsx
│   │   ├── PRGenerator.tsx
│   │   └── Welcome.tsx
│   ├── core/                 # Core business logic
│   │   ├── git.ts            # Git operations
│   │   ├── quality-gates.ts  # Quality gates engine
│   │   ├── convention-learner.ts  # Pattern detection
│   │   ├── branch-intelligence.ts # Branch management
│   │   ├── git-shield.ts     # Git state safety
│   │   ├── lockfile.ts       # Process synchronization
│   │   ├── gitleaks-bridge.ts # Secret detection
│   │   ├── audit-logbook.ts  # Audit trail
│   │   ├── compliance-report.ts # Compliance exports
│   │   ├── cloud-sync.ts     # CLI-to-cloud telemetry
│   │   └── auth.ts           # Supabase authentication
│   ├── ai/                   # AI provider integrations
│   │   ├── providers.ts      # Multi-provider client
│   │   ├── learning.ts       # User preference learning
│   │   └── model-selector.ts # Auto model selection
│   ├── mcp/                  # MCP server
│   │   ├── server.ts         # MCP server implementation
│   │   └── index.ts          # MCP entry point
│   ├── commands/             # CLI commands
│   │   ├── index.ts          # Command registry
│   │   ├── init.ts           # Initialize hooks
│   │   ├── branch.ts         # Branch management
│   │   ├── review.ts         # Code review
│   │   ├── audit.ts          # Audit viewing
│   │   └── report.ts         # Compliance reports
│   └── utils/                # Configuration & helpers
│       ├── config.ts
│       ├── gitpulse-config.ts # YAML/JSON config
│       └── context.ts
│
├── web/                      # Next.js web dashboard
│   ├── app/                  # Next.js app router
│   │   ├── api/              # API routes
│   │   ├── dashboard/        # Dashboard page
│   │   ├── profile/          # User profile
│   │   └── settings/         # Settings page
│   ├── components/           # React components
│   │   ├── activity-heatmap.tsx
│   │   └── charts.tsx
│   └── lib/                  # Utilities
│       ├── jwt.ts            # JWT tokens
│       ├── rate-limit.ts     # Rate limiting
│       ├── validation.ts     # Input validation
│       └── audit.ts          # Audit logging
│
├── action/                   # GitHub Action
│   ├── index.ts              # Action entry point
│   └── format-comment.ts     # PR comment formatting
│
└── docs/                     # Documentation
    ├── NORTHSTAR.md          # This document
    ├── architecture.md       # System design
    ├── project_memory.md     # Decisions & context
    └── dev_log.md            # Development log
```

### Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Language** | TypeScript 5.3+ | Type safety, maintainability |
| **CLI Framework** | Ink + React | Terminal UI components |
| **Web Framework** | Next.js 16 + React 19 | Dashboard application |
| **Styling** | Tailwind CSS 4 | Modern CSS framework |
| **Database** | Supabase (PostgreSQL) | Auth, telemetry, settings |
| **AI Providers** | Ollama, OpenRouter, OpenAI, Google, Groq | Multi-model support |
| **Git Operations** | simple-git | Reliable git automation |
| **Testing** | Vitest | Unit testing framework |
| **Security** | JWT, bcrypt, zod | Auth, hashing, validation |
| **MCP Protocol** | @modelcontextprotocol/sdk | AI agent integration |
| **AST Parsing** | @babel/parser, traverse | Code analysis |
| **Error Tracking** | Console + Vercel | Simple logging (Sentry TBD post-revenue) |

---

## 4. Core Features & Capabilities

### 4.1 Quality Gates Engine

Four automated gates run on every commit:

| Gate | Purpose | Detection |
|------|---------|-----------|
| **Security Scan** | Prevent credential leaks | Hardcoded secrets (Gitleaks), SQL injection, XSS, path traversal |
| **Code Smells** | Maintain code quality | Long functions (>50 lines), TODO/FIXME markers, console.log, debugger |
| **Test Coverage** | Ensure test discipline | Missing test files for changed code |
| **Documentation** | Enforce documentation | Missing JSDoc on exported functions |

**Quality Score:** 0-100 calculated from gate results
- 100 = All gates pass
- < 60 = Critical issues present

**Modes:**
- `--strict`: Blocks commit on any failure
- `--lax`: Hides warnings
- Default: Shows warnings but allows commit with override justification

### 4.2 Convention Learning System

Automatically detects and learns team patterns:

| Pattern Type | Example |
|--------------|---------|
| Naming Conventions | camelCase, PascalCase, snake_case |
| Commit Patterns | Types (feat, fix, docs), scopes, description style |
| Architectural Boundaries | Module separation, layer organization |
| File Relationships | Co-change patterns, dependency graphs |

**Storage:** `.gitpulse/conventions.json`
**Context Injection:** AI prompts include learned conventions

### 4.3 Git-Shield Safety System

Prevents operations during unsafe git states:

| State | Detection | Action |
|-------|-----------|--------|
| Rebase in progress | `.git/rebase-merge` | Abort with message |
| Merge conflicts | `.git/MERGE_HEAD` | Abort with message |
| Cherry-pick in progress | `.git/CHERRY_PICK_HEAD` | Abort with message |
| Revert in progress | `.git/REVERT_HEAD` | Abort with message |
| Bisect in progress | `.git/BISECT_LOG` | Abort with message |
| Detached HEAD | `git rev-parse` | Warning |
| Unmerged files | Conflict markers | Abort with message |

### 4.4 Lockfile Process Control

Prevents concurrent GitPulse operations:

- Atomic `mkdir`-based locking
- Cross-platform support (Windows + Unix)
- Auto-release on process exit (SIGINT, SIGTERM)
- Stale lock detection (30-second threshold)
- Process liveness verification

### 4.5 Audit Logbook

Compliance-ready audit trail:

```typescript
interface AuditEntry {
  id: string;
  timestamp: string;
  branch: string;
  command: string;
  score: number;
  gates: GateResult[];
  issues: QualityIssue[];
  override?: {
    justification: string;
    timestamp: string;
  };
}
```

**Features:**
- Local-first storage (`.gitpulse/audit.json`)
- Up to 1000 entries with automatic trimming
- Statistics calculation (pass rate, avg score, overrides)
- Export functionality for compliance reporting

### 4.6 MCP Server Integration

Exposes git intelligence via Model Context Protocol:

| Tool | Purpose | Returns |
|------|---------|---------|
| `analyze_repo` | Repository health check | Health score, metrics, issues |
| `suggest_commit` | AI commit message | Suggested message with context |
| `review_changes` | Quality review of staged changes | Gate results, issues, score |
| `run_quality_gates` | Run all quality gates | Detailed report with scores |
| `validate_commit` | Validate commit message format | Validation result, suggestions |
| `get_conventions` | Get team conventions | Learned patterns, naming styles |
| `search_history` | Search commit history | Matching commits, statistics |
| `branch_info` | Get branch information | Status, ahead/behind, merge status |
| `get_config` | Get GitPulse configuration | Config values, quality gate settings |
| `analyze_file` | Analyze file complexity | Metrics, issues, suggestions |

**Resources:**
- `repo://status` — Current git status
- `repo://config` — GitPulse configuration

**Compatible Tools:** Windsurf, Claude Desktop, Cursor, Claude Code, any MCP client

### 4.7 Web Dashboard

Next.js-based analytics and management:

**Features:**
- GitHub OAuth authentication
- JWT session encryption
- Quality gate run history
- Productivity metrics (AI commits, time saved, streaks)
- Activity heatmap (GitHub-style)
- API key management
- Real-time sync via Supabase

**Security:**
- Rate limiting (10 req/15min per IP)
- CSRF protection
- Input validation (zod)
- reCAPTCHA v3 on forms
- Audit logging for all operations

### 4.8 GitHub Action

CI/CD quality gate integration:

```yaml
- uses: CodedRichy/GitPulse/action@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    strict: 'true'
    gates: 'security-scan,code-smells'
    fail-on: 'critical'
```

**Outputs:**
- `passed`: Boolean pass/fail
- `score`: 0-100 quality score
- `issues`: Total issue count
- `report`: JSON quality report

### 4.9 Smart Provider Health System

Intelligent AI provider monitoring with automatic failover:

**Circuit Breaker Pattern:**
- Opens after 3 consecutive failures
- Half-open state tests recovery after 5 minutes
- Auto-resets on success, full isolation on failure

**Health Scoring Algorithm:**
- Success rate (40% weight)
- Latency (30% weight)
- Recency (20% weight)
- Stability (10% weight)

**Visual Indicators:**
- ⚡ Fast provider
- 🟢 Healthy provider
- 🐌 Slow provider
- 🟡 Degraded provider
- 🔴 Unavailable provider

**Auto-Fallback:**
- Automatically switches to best available provider
- No user intervention required
- Background health checks every 30 seconds

### 4.10 Distribution & Installation

Multiple installation methods for different user preferences:

**PowerShell One-Liner (Windows):**
```powershell
irm https://gitpulse.dev/install.ps1 | iex
```
- No Node.js or npm required
- Automatic dependency installation
- PATH configuration handled automatically

**npm Global Install:**
```bash
npm install -g gitpulse
```
- Standard Node.js distribution
- Cross-platform support
- Automatic updates via npm

**Build from Source:**
```bash
git clone https://github.com/CodedRichy/GitPulse.git
cd GitPulse
npm install
npm run build
npm link
```

---

## 5. Data Flow & Workflows

### Commit Message Generation (Primary Workflow)

```
1. User runs: gitpulse commit
2. Lockfile acquired (prevents concurrent operations)
3. Git-Shield checks for unsafe git states
4. Quality gates scan staged changes:
   - Security scan (secrets, SQL injection, XSS)
   - Code smells (long functions, TODOs)
   - Test coverage check
   - Documentation validation
5. Convention learner analyzes repo:
   - Extracts naming patterns
   - Identifies commit patterns
   - Detects architectural boundaries
6. Context is built from:
   - File changes
   - Past commit history
   - Team conventions (learned)
   - Quality gate results
7. AI provider analyzes changes with context
8. AI generates commit message using team conventions
9. User reviews and edits (optional)
10. If gates failed: offer override with justification
11. Commit is created
12. Audit logbook records the run
13. Telemetry syncs to cloud (non-blocking)
14. Lockfile released
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

### MCP Server Communication

```
1. External AI agent (Windsurf, Claude Desktop) calls MCP tool
2. MCP server receives request via stdio
3. Server routes to appropriate tool handler
4. Tool executes using GitPulse core modules
5. Result returned as JSON to AI agent
6. AI agent uses result in its workflow
```

---

## 6. Configuration System

### Configuration Hierarchy

1. **Environment Variables** (highest priority)
   - `.env` file
   - System environment

2. **Project Configuration**
   - `.gitpulse/config.yml` (YAML format, preferred)
   - `.gitpulse/config.yaml`
   - `.gitpulse/config.json` (legacy JSON)

3. **User Configuration**
   - Supabase settings (cross-device sync)
   - Local cache

4. **Default Values** (lowest priority)

### Example Configuration

```yaml
# .gitpulse/config.yml
version: 1

quality_gates:
  security-scan:
    enabled: true
    severity: critical
  code-smells:
    enabled: true
    severity: high
  test-coverage:
    enabled: true
    severity: medium
  documentation:
    enabled: true
    severity: low

conventions:
  commit_style: conventional
  enforce_scope: false
  allowed_types:
    - feat
    - fix
    - docs
    - style
    - refactor
    - test
    - chore
  auto_learn: true

hooks:
  pre_commit: true
  commit_msg: true

cloud_sync:
  api_key: null  # Set via dashboard
  auto_sync: true
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
| `COMMIT_STYLE` | Commit style (conventional, semantic, simple) | No |

---

## 7. Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Input Validation                           │
│ - zod schemas for all inputs                        │
│ - TypeScript strict mode                            │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ Layer 2: Secret Detection                             │
│ - Gitleaks integration (industry standard)              │
│ - Regex fallback patterns                               │
│ - Pre-commit blocking                                   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ Layer 3: Authentication & Authorization               │
│ - JWT tokens (cryptographically secure)               │
│ - bcrypt hashed API keys                              │
│ - RLS policies in Supabase                            │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ Layer 4: Rate Limiting & Abuse Prevention             │
│ - 10 req/15min per IP (API endpoints)                 │
│ - 100 req/hour per IP (telemetry)                     │
│ - reCAPTCHA v3 on forms                               │
│ - CSRF token protection                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ Layer 5: Audit & Compliance                           │
│ - Comprehensive audit logging                           │
│ - Compliance report generation                          │
│ - Data retention policies (90d telemetry, 365d tickets)│
│ - GDPR compliance (data export, account deletion)      │
│ - Console error logging (Sentry post-revenue)            │
└───────────────────────────────────────────────────────┘
```

### Secret Detection Patterns

| Pattern Type | Examples |
|--------------|----------|
| API Keys | AWS, Stripe, SendGrid, etc. |
| Tokens | JWT, Bearer, Personal Access |
| Passwords | Database URLs, connection strings |
| Private Keys | RSA, SSH, PEM |

### Vulnerability Detection

| Vulnerability | Detection Method |
|---------------|------------------|
| SQL Injection | Pattern matching on query strings |
| XSS | Script tag detection, inline event handlers |
| Path Traversal | `../` patterns, absolute path risks |
| Hardcoded Secrets | Gitleaks + regex patterns |

---

## 8. Strategic Roadmap

### Phase 1-5: Complete ✅

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Core CLI (commits, status, explain, PR) | ✅ Complete |
| **Phase 2** | Killer Features (undo/redo, learning) | ✅ Complete |
| **Phase 3** | Workflow Enhancement (hooks, branch mgmt) | ✅ Complete |
| **Phase 4** | Advanced Features (code review, issues) | ✅ Complete |
| **Phase 5** | MCP Integration & Quality Gates | ✅ Complete |
| **Phase 5.5** | Security & Data Governance | ✅ Complete |
| **Phase 5.6** | Smart Provider Health & Distribution | ✅ Complete |

### Phase 6: Foundation Reset ✅ Complete

**Goal:** Harden the foundation for production readiness

| Task | Priority | Status |
|------|----------|--------|
| Git-Shield safety system | P0 | ✅ Complete |
| Lockfile process control | P0 | ✅ Complete |
| Gitleaks integration | P0 | ✅ Complete |
| Audit Logbook | P1 | ✅ Complete |
| Override with justification | P1 | ✅ Complete |
| Compliance reports | P1 | ✅ Complete |
| Add .gitpulse.yml support | P1 | ✅ Complete |
| YAML configuration | P2 | ✅ Complete |
| Smart Provider Health | P1 | ✅ Complete |
| PowerShell Installer | P2 | ✅ Complete |

### Phase 7: Distribution & MCP Expansion ✅ Complete

**Status:** All MCP tools implemented (10 total), GitHub Action v1 complete

| Feature | Description | Status |
|---------|-------------|--------|
| GitHub Action v1 | CI integration with quality gates | Complete |
| Expand MCP tools | 10 tools implemented (was: 3) | Complete |
| VSCode Extension | Inline quality gate results in IDE | Planned |
| Convention learning v2 | ML-backed instead of heuristic | Planned |

### Phase 8: Documentation & Audit Response Complete

**Status:** Claude Code Audit completed, Implementation Plan Phase 9 created, Lemon Squeezy billing integrated

| Feature | Description | Status |
|---------|-------------|--------|
| Claude Audit Response | Comprehensive product audit | April 18, 2026 |
| Implementation Plan v9 | 6-month enterprise roadmap | April 18, 2026 |
| Pricing Strategy Update | Revised to $25/dev/month Pro tier | April 18, 2026 |
| Lemon Squeezy Integration | Billing & revenue with automated tax compliance | April 18, 2026 |
| Next.js 15+ Compatibility | TypeScript fixes and async params migration | April 18, 2026 |
| Web App Security Audit | 20 vulnerabilities identified and documented | April 18, 2026 |

### Phase 9: Enterprise Readiness & Revenue (Current)

**Goal:** Transform from "premium indie tool" to "venture-scale enterprise product"
**Timeline:** 6 months (April - October 2026)
**Based on:** Claude Code Audit findings
**Status:** Phase 9.1 Complete (Team Foundation), Phase 9.2 UI Shells Complete (Team Dashboard pages created, API wiring pending)

| Phase | Focus | Duration | Key Deliverables |
|-------|-------|----------|------------------|
| **9.1** | Enterprise Foundation | Month 1 | ✅ Team schema, RBAC API, CLI team support |
| **9.2** | Team Dashboard | Month 2 | ⏳ Team analytics, compliance exports, enterprise features |
| **9.3** | Security Hardening | Month 2-3 | ⏳ Field-level encryption, distributed locks, audit immutability |
| **9.4** | New Pricing Model | Month 3 | ⏳ $25/dev/month Pro, $2k-5k Enterprise, sales flow |
| **9.5** | Distribution | Month 4-5 | ⏳ GitHub Marketplace, AI tool partnerships, content marketing |
| **9.6** | Scale Prep | Month 6 | ⏳ Performance optimization, monitoring, 99.9% uptime |

**Kill Criteria (Month 6):**
- ❌ 500+ free sign-ups → Rethink messaging
- ❌ 5+ Pro customers → Product-market fit is fake
- ❌ 1+ Enterprise conversation → Pivot to SMB

**Target:** $50k MRR path by Month 6, venture-fundable metrics

---

## 9. Success Metrics

### Phase 1-3 Success Criteria (Achieved)

| Metric | Target | Status |
|--------|--------|--------|
| Zero concurrent operation bugs | 100% lock acquisition | ✅ |
| Zero unsafe-state data loss | 100% Git-Shield coverage | ✅ |
| Secret detection coverage | Industry standard (Gitleaks) | ✅ |
| Audit completeness | 100% of runs logged | ✅ |
| Override transparency | 100% with justification | ✅ |
| Compliance exportable | Markdown report generation | ✅ |

### Business Metrics (Target: End of 2026)

| Metric | Target |
|--------|--------|
| Active developers | 10,000+ |
| Commits protected | 1M+ |
| Secrets prevented | 1,000+ |
| Team customers | 100+ |
| NPS score | 50+ |

### Technical Health Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Test coverage | >80% | ~40% |
| TypeScript strict | 100% | 100% |
| Security audit | Zero critical | 7 critical, 8 high identified (2026-04-18) |
| Performance | <500ms gates | <300ms |

---

## 10. Core Principles & Philosophy

### 10.1 Local-First Architecture

**Principle:** Code never leaves the local machine unless explicitly configured.

**Benefits:**
- No rate limits from cloud APIs
- Privacy-first (sensitive code stays local)
- Zero latency with local models (Ollama)
- Offline capability

**Exception:** Telemetry sync to cloud (opt-in, non-blocking)

### 10.2 Multi-Provider AI Support

**Principle:** Never be locked into a single AI provider.

**Supported Providers:**
- **Ollama:** Local models, zero cost, privacy-first
- **OpenRouter:** Cloud models, multiple options
- **OpenAI:** GPT models for advanced features
- **Google:** Gemini models
- **Groq:** Fast inference models

### 10.3 Context-Aware Intelligence

**Principle:** GitPulse understands your codebase and team.

**Mechanisms:**
- Convention learning from commit history
- File relationship analysis (co-changes)
- Quality gate results influence AI prompts
- Team patterns injected into suggestions

### 10.4 Quality-First Development

**Principle:** GitPulse must exemplify the quality it enforces.

**Standards:**
- TypeScript strict mode
- Comprehensive test coverage
- Security-first design
- Documentation-driven development

### 10.5 Transparent Governance

**Principle:** All quality decisions must be explainable and auditable.

**Features:**
- Every gate result shows detection reason
- Override requires justification
- Full audit trail
- Compliance export

---

## 11. API Reference

### CLI Commands

| Command | Description | Flags |
|---------|-------------|-------|
| `gitpulse init` | Initialize hooks and config | `--force` |
| `gitpulse commit` | Smart commit with quality gates | `--strict`, `--lax`, `--dry-run` |
| `gitpulse status` | Repository status | - |
| `gitpulse review [target]` | Code review | `staged`, `<file>` |
| `gitpulse pr` | Generate PR description | `--dry-run` |
| `gitpulse doc <file>` | Generate documentation | - |
| `gitpulse branch <subcmd>` | Branch management | `list`, `create`, `suggest` |
| `gitpulse undo` | Undo last commit | - |
| `gitpulse redo` | Redo last undone commit | - |
| `gitpulse mcp start` | Start MCP server | - |
| `gitpulse audit` | View audit logbook | - |
| `gitpulse report` | Generate compliance report | `--period`, `--output` |
| `gitpulse dashboard` | Open web dashboard | `--port` |
| `gitpulse logout` | Sign out | - |

### MCP Tools

| Tool | Parameters | Returns |
|------|------------|---------|
| `analyze_repo` | `path?: string` | `{ healthScore, metrics, issues }` |
| `suggest_commit` | `path?: string, style?: string` | `{ message, explanation }` |
| `review_changes` | `path?: string, target?: 'staged' \| 'unstaged'` | `{ passed, score, issues }` |
| `run_quality_gates` | `path?: string, strict?: boolean, gates?: string[]` | `{ passed, score, gates, issues }` |
| `validate_commit` | `path?: string, message: string` | `{ valid, errors, suggestions }` |
| `get_conventions` | `path?: string` | `{ patterns, naming, relationships }` |
| `search_history` | `path?: string, query: string, limit?: number` | `{ commits, statistics }` |
| `branch_info` | `path?: string` | `{ current, status, ahead, behind }` |
| `get_config` | `path?: string` | `{ config, gates, conventions }` |
| `analyze_file` | `path?: string, file: string` | `{ complexity, issues, metrics }` |

### Web API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/github` | POST | - | GitHub OAuth callback |
| `/api/session` | GET/POST | JWT | Session management |
| `/api/settings` | GET/POST | JWT | User settings |
| `/api/stats` | GET | JWT | Productivity stats |
| `/api/telemetry` | POST | API Key | CLI telemetry sync |
| `/api/telemetry` | GET | JWT | Fetch telemetry |
| `/api/health` | GET | - | Health check |
| `/api/user/export` | POST | JWT | GDPR data export |
| `/api/user/delete` | POST | JWT | Account deletion |

---

## 12. Development Guidelines

### Getting Started

```bash
# Clone and setup
git clone https://github.com/CodedRichy/GitPulse.git
cd GitPulse
npm install

# Development
npm run dev              # Run CLI in dev mode
npm run dev -- commit    # Run specific command
npm run typecheck        # Type check
npm run test             # Run tests
npm run build            # Build for production

# Web dashboard
cd web
npm install
npm run dev              # Start Next.js dev server
```

### Contribution Guidelines

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** with conventional messages: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request

### Quality Gates for Contributors

- All PRs must pass quality gates
- Add tests for new functionality
- Update documentation for API changes
- Follow existing TypeScript patterns

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **AI Commit** | Commit message generated by AI with quality gates |
| **Audit Logbook** | Local-first audit trail of all quality gate runs |
| **Convention Learning** | Automatic detection of team coding patterns |
| **Git-Shield** | Safety system preventing operations during unsafe git states |
| **Gitleaks** | Industry-standard secret detection tool |
| **Ink** | React-based terminal UI framework |
| **Lockfile** | Process synchronization preventing concurrent operations |
| **MCP** | Model Context Protocol for AI agent integration |
| **Quality Gate** | Automated check (security, smells, coverage, docs) |
| **Quality Score** | 0-100 score from gate results |
| **Strict Mode** | Blocks commits on any quality failure |
| **Smart Provider Health** | AI provider monitoring with automatic failover |
| **Circuit Breaker** | Pattern that stops requests to failing providers |
| **Health Score** | Weighted algorithm for provider reliability |
| **Auto-Fallback** | Automatic switching to best available provider |
| **GDPR Compliance** | Data export and account deletion features |

---

## 14. Related Documents

| Document | Purpose |
|----------|---------|
| `architecture.md` | Detailed system architecture and module design |
| `project_memory.md` | Project decisions, context, and memory |
| `dev_log.md` | Development log and progress tracking |
| `agent.md` | AI assistant usage instructions |

---

## 15. Document History

| Date | Version | Change |
|------|---------|--------|
| 2026-04-17 | 1.0.0 | Initial comprehensive North Star document |
| 2026-04-18 (AM) | 1.1.0 | Added Smart Provider Health, Distribution methods, updated MCP tools (10 total), revised pricing strategy, enhanced security architecture |
| 2026-04-18 (PM) | 1.2.0 | Marked Phase 6-8 complete, added Phase 9 Enterprise Readiness roadmap based on Claude Code Audit, updated status to reflect current focus |
| 2026-04-18 (Late PM) | 1.3.0 | Added Lemon Squeezy billing integration, Next.js 15+ compatibility fixes, Web App Security Audit findings (20 vulnerabilities), updated security audit status |
| 2026-04-18 (Late PM) | 1.4.0 | Updated Phase 9.1 as complete, Phase 9.2 in progress, corrected pricing documentation ($19 Pro, $99 Team), documented codebase cleanup and security improvements |
| 2026-04-18 (Late PM) | 1.5.0 | Created all Phase 9.2 Team Dashboard UI shells (teams list, detail layout, analytics, members, settings), Netlify deployment fixes, updated all documentation |

---

*This document is the single source of truth for GitPulse's strategic direction, architecture, and product vision. All development decisions should align with the principles and roadmap outlined here.*

**Next Review Date:** May 17, 2026
