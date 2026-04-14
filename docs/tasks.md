# GitPulse Tasks

## Pending Tasks

### Phase 1: Enhanced CLI (Current Priority)

#### Documentation Generation Command
- [ ] Create `DocGenerator.tsx` component
- [ ] Implement file reading and analysis
- [ ] Add AI prompt for documentation generation
- [ ] Create Claude Code-style UI for doc display
- [ ] Add command routing in `index.ts`

#### Enhanced PR Description Generation
- [ ] Analyze commit history for patterns
- [ ] Extract file changes and impact analysis
- [ ] Generate comprehensive PR descriptions with:
  - [ ] Summary
  - [ ] Detailed changes
  - [ ] Testing checklist
  - [ ] Breaking changes
  - [ ] Related issues
- [ ] Add Claude Code-style UI improvements

#### Code Analysis Engine
- [ ] Install `@babel/parser` and `@babel/types` for AST parsing
- [ ] Create `src/core/analyzer.ts` with:
  - [ ] Function extraction
  - [ ] Dependency graph generation
  - [ ] Complexity analysis
  - [ ] Documentation coverage detection
- [ ] Integrate with doc generation command

#### Team Convention Learning
- [ ] Create `src/core/conventions.ts`
- [ ] Parse past commit messages for patterns
- [ ] Learn:
  - [ ] Commit message format (conventional vs custom)
  - [ ] PR description structure
  - [ ] Code comment style
- [ ] Store learned patterns in local cache

### Phase 2: Distribution (Planned)

#### VSCode Extension
- [ ] Initialize VSCode extension structure
- [ ] Set up manifest.json with commands
- [ ] Create extension UI panels
- [ ] Integrate with existing TypeScript core
- [ ] Highlight poorly documented functions
- [ ] Show inline documentation suggestions
- [ ] Generate PR descriptions from git diff
- [ ] Add command palette integration
- [ ] Create settings panel

#### GitHub Action
- [ ] Create `github-action/` directory
- [ ] Write action.yml with event triggers
- [ ] Implement action script in TypeScript
- [ ] Add PR comment posting logic

#### Issue Tracker Integration
- [ ] Create `src/integrations/github.ts`
- [ ] Implement GitHub API client
- [ ] Add Linear integration
- [ ] Add Jira integration

### Phase 3: Analytics & Dashboard (Planned)

#### Web Dashboard
- [ ] Initialize React project with Vite
- [ ] Set up routing and layout
- [ ] Create authentication (GitHub OAuth)
- [ ] Connect to GitPulse API

#### Documentation Coverage Metrics
- [ ] Implement coverage calculation logic
- [ ] Create coverage visualization charts
- [ ] Add per-file and per-repo metrics
- [ ] Track trends over time

#### Team Analytics
- [ ] Team leaderboard for documentation quality
- [ ] Commit message quality scores
- [ ] PR review time analysis
- [ ] Team convention adherence metrics

## Completed Tasks

### Core CLI Foundation
- ✅ AI commit message generation
- ✅ Repository status display
- ✅ File history explanation
- ✅ PR description generation
- ✅ Claude Code-style UI
- ✅ Multi-model AI support (Ollama, OpenRouter, OpenAI)
- ✅ TypeScript + Ink architecture
- ✅ Configuration management

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
| Documentation generation | High | Medium | P0 | 1 |
| Enhanced PR descriptions | High | Medium | P0 | 1 |
| Code analysis engine | High | Medium | P0 | 1 |
| Team convention learning | High | Medium | P0 | 1 |
| VSCode extension | High | High | P1 | 2 |
| GitHub Action | High | Medium | P1 | 2 |
| Issue tracker integration | Medium | Medium | P1 | 2 |
| Web dashboard | Medium | High | P2 | 3 |
| Documentation coverage metrics | Medium | Medium | P2 | 3 |
| Team analytics | Medium | High | P2 | 3 |
