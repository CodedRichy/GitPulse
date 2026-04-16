# GitPulse Tasks

## Pending Tasks

### Phase 6: Foundation Reset (Current Priority)

#### Critical Cleanup
- [ ] Delete dead script files from src/ (7 files, ~21KB):
  - [ ] `clean_imports.ts`
  - [ ] `fix_input.ts`
  - [ ] `fix_login_compile.ts`
  - [ ] `replace_use_app.ts`
  - [ ] `update_exit.ts`
  - [ ] `update_login.ts`
  - [ ] `update_welcome.ts`

#### Test Coverage
- [ ] Add test framework (Jest or Vitest)
- [ ] Write unit tests for `src/core/quality-gates.ts`
  - [ ] SecurityScanGate tests
  - [ ] CodeSmellsGate tests
  - [ ] TestCoverageGate tests
  - [ ] DocumentationGate tests
- [ ] Write unit tests for `src/core/convention-learner.ts`
  - [ ] Pattern extraction tests
  - [ ] Naming convention detection tests
  - [ ] Serialization tests
- [ ] Write unit tests for `src/ai/providers.ts`
  - [ ] Mock API tests for each provider
- [ ] Write integration test for end-to-end commit generation

#### CI/CD Pipeline
- [ ] Create `.github/workflows/` directory
- [ ] Add `ci.yml` workflow:
  - [ ] Type check (tsc --noEmit)
  - [ ] Lint check
  - [ ] Build verification
  - [ ] Run tests
- [ ] Add `publish.yml` workflow for npm releases

#### Type Safety
- [ ] Remove `args: any` from `src/mcp/server.ts` (lines 168, 200, 269)
- [ ] Add proper type definitions for tool arguments
- [ ] Fix `calculateHealthScore(status: any)` to use proper types
- [ ] Audit codebase for other `any` usage

#### Configuration
- [ ] Add `.gitpulse.yml` configuration support
- [ ] Define schema for convention rules
- [ ] Allow manual override of learned conventions
- [ ] Add team-editable rules support

#### Distribution
- [ ] Update `package.json` version to 3.1.0
- [ ] Implement `gitpulse init` command for hook installation
- [ ] Add pre-commit hook installation
- [ ] Add commit-msg hook installation
- [ ] Configure npm publish settings
- [ ] Test `npx gitpulse init` workflow

### Phase 7: Distribution & MCP Expansion (Planned)

#### GitHub Action
- [ ] Create GitHub Action for CI quality gate integration
- [ ] Run quality gates in CI pipeline
- [ ] Comment on PRs with quality gate results
- [ ] Block merges on critical failures

#### MCP Expansion
- [ ] Expand MCP tools from 3 to 10+:
  - [ ] Commit history semantic search
  - [ ] Convention-aware commit message validation
  - [ ] Branch naming suggestions
  - [ ] PR template generation from conventions
  - [ ] Risk scoring for changes (file co-change history)
  - [ ] Conflict probability prediction
  - [ ] File relationship mapping
  - [ ] Architectural boundary detection
  - [ ] Convention rule validation
  - [ ] Batch commit analysis

#### VSCode Extension
- [ ] Initialize VSCode extension structure
- [ ] Set up manifest.json with commands
- [ ] Show quality gate results inline
- [ ] Highlight convention violations
- [ ] Add command palette integration

#### Convention Learning v2
- [ ] Move from heuristic-based to ML-backed pattern extraction
- [ ] Improve accuracy of convention detection
- [ ] Add confidence scoring for learned patterns

### Phase 8: Team & Revenue (Planned)

#### Team Dashboard
- [ ] Build team governance console
- [ ] Show org-wide commit quality trends
- [ ] Flag convention drift by developer
- [ ] Aggregate quality gate results across org
- [ ] Convention rule management UI

#### Supabase Team Sync
- [ ] Share conventions across team members
- [ ] Sync quality gate configurations
- [ ] Team-wide analytics

#### Convention Marketplace
- [ ] Share/import convention packs
- [ ] Pre-built templates (Google Style, Conventional Commits Strict, etc.)
- [ ] Community-driven adoption

## Completed Tasks

### Phase 1-5: Core Features (Complete)
- ✅ AI commit message generation
- ✅ Repository status display
- ✅ File history explanation
- ✅ PR description generation
- ✅ Claude Code-style UI
- ✅ Interactive diff preview for commit command
- ✅ Smart undo/redo functionality with history tracking
- ✅ Real-time learning from user corrections
- ✅ Multi-model AI support (Ollama, OpenRouter, OpenAI, Google, Groq)
- ✅ Auto model selection based on task context
- ✅ One-command setup with auto-configuration
- ✅ Pre-commit hooks integration
- ✅ Multi-file context for AI generation
- ✅ Branch management commands (create, switch, delete, list, rename, suggest)
- ✅ Conflict resolution assistant with AI
- ✅ Branch intelligence and AI-powered suggestions
- ✅ Code review automation with static analysis + AI
- ✅ Issue tracker integration (GitHub/Linear/Jira)
- ✅ TypeScript + Ink architecture
- ✅ Configuration management

### Phase 5: MCP Integration & Quality Gates (Complete)
- ✅ MCP server with 3 tools (analyze_repo, suggest_commit, review_changes)
- ✅ Quality gates engine:
  - ✅ Security Scan (hardcoded secrets, SQL injection, XSS, path traversal)
  - ✅ Code Smells (long functions, TODO/FIXME, console.log, debugger)
  - ✅ Test Coverage (missing tests for changed files)
  - ✅ Documentation (missing JSDoc on exports)
- ✅ Convention learner for team pattern detection
- ✅ Context-aware AI prompts
- ✅ `--strict` flag for blocking commits on failures
- ✅ `--lax` flag for hiding warnings

### Documentation Restructuring (2026-04-14)
- ✅ Consolidated scattered markdown files
- ✅ Created structured memory system
- ✅ Moved research files to `/docs/research/`
- ✅ Archived implementation plans to `/docs/archive/`
- ✅ Created core memory files:
  - ✅ `project_memory.md`
  - ✅ `architecture.md`
  - ✅ `dev_log.md`
  - ✅ `tasks.md`
  - ✅ `agent.md`

### Strategic Review (2026-04-15)
- ✅ Comprehensive market viability assessment
- ✅ Competitive analysis completed
- ✅ Technical debt audit performed
- ✅ Strategic pivot to "Guardrails for AI-Assisted Development"
- ✅ Documentation updated with new positioning

### Phase 6.5: Web Security & Real-Time Sync (Complete 2026-04-16)
- ✅ JWT session token encryption (replaced insecure base64)
- ✅ Rate limiting on API endpoints (10 req/15min per IP)
- ✅ Input validation on all API endpoints
- ✅ Secure JWT secret key generation (512-bit random)
- ✅ Cookie-based sessions (migrated from localStorage)
- ✅ Health check endpoint at `/api/health`
- ✅ CSRF protection framework
- ✅ Environment variable validation
- ✅ Error boundary component
- ✅ Caching headers on session API
- ✅ Real-time user data sync (Supabase Realtime)
- ✅ Settings page real-time updates
- ✅ Profile page real-time updates
- ✅ Dashboard navbar consistency
- ✅ All documentation updated with security changes

## Future Improvements

### Workflow Enhancements
- Interactive diff preview with [Edit] [Accept] [Retry] [Cancel] actions
- Smart undo/redo with commit history tracking
- One-command setup (`gitpulse init`)
- Pre-commit hooks for quality checks
- Multi-file context analysis

### Advanced Features
- Branch intelligence (suggest branch names)
- Conflict resolution assistance
- Code review automation
- Security scanning for secrets
- Dependency impact analysis
- Test generation

### Ecosystem
- CI/CD integration (GitHub Actions, GitLab CI)
- Team dashboard for analytics
- AI-powered onboarding assistant
- Custom model fine-tuning

## Dependencies to Install

```bash
npm install @babel/parser @babel/types @babel/traverse
npm install @types/babel__parser @types/babel__types
npm install axios # For GitHub/Linear/Jira API calls
```

## Priority Matrix

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| Delete dead code | High | Low | P0 | 6 |
| Add test coverage | High | Medium | P0 | 6 |
| Set up CI/CD | High | Medium | P0 | 6 |
| Fix version consistency | High | Low | P0 | 6 |
| Remove `any` types | Medium | Medium | P0 | 6 |
| .gitpulse.yml config | High | Medium | P0 | 6 |
| npm publish with hooks | High | Medium | P0 | 6 |
| GitHub Action for CI | High | Medium | P1 | 7 |
| Expand MCP tools | High | High | P1 | 7 |
| VSCode extension | High | High | P1 | 7 |
| Convention learning v2 | Medium | High | P1 | 7 |
| Team dashboard | High | High | P2 | 8 |
| Supabase team sync | High | Medium | P2 | 8 |
| Convention marketplace | Medium | Medium | P2 | 8 |
