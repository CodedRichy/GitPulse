# GitPulse: Grammarly for Code - Implementation Plan

## Vision
Transform GitPulse from "privacy-first automated Git commits" to "Grammarly for Code" — AI writes your commit messages, PR descriptions, and code documentation automatically.

## Product Positioning
**Old:** Privacy-first local AI that auto-commits
**New:** AI writes your commit messages, PR descriptions, and code documentation automatically. Stop context-switching to write docs — let AI handle it while you code.

## Target Market
- Individual developers who want better documentation
- Teams that need consistent commit messages and PR descriptions
- Companies struggling with documentation maintenance

## Pricing
- Individual: $9/month (hobbyists, solo devs)
- Team: $15/user/month (5-50 devs)
- Enterprise: Custom pricing (50+ devs, on-prem, custom models)

## Architecture

```
GitPulse v3.0 (TypeScript + Ink)
├── src/
│   ├── index.ts              # CLI entry point
│   ├── components/           # React Ink UI components
│   │   ├── App.tsx
│   │   ├── ClaudeUI.tsx      # Shared UI primitives
│   │   ├── CommitWizard.tsx
│   │   ├── StatusPanel.tsx
│   │   ├── ConfigPanel.tsx
│   │   ├── ExplainView.tsx
│   │   ├── PRGenerator.tsx
│   │   └── DocGenerator.tsx  # NEW: Documentation generation
│   ├── core/
│   │   ├── git.ts
│   │   ├── models.ts
│   │   └── analyzer.ts       # NEW: Code analysis engine
│   ├── ai/
│   │   ├── providers.ts
│   │   └── prompts.ts        # NEW: Prompt templates
│   ├── utils/
│   │   ├── config.ts
│   │   └── ast-parser.ts     # NEW: AST parsing utilities
│   └── integrations/         # NEW
│       ├── github.ts         # GitHub API integration
│       └── jira.ts           # Jira integration
├── vscode-extension/         # NEW: VSCode extension
├── github-action/            # NEW: GitHub Action
├── web-dashboard/            # NEW: Web dashboard (React)
└── docs/
    └── grammarly-for-code-plan.md
```

## Phase 1: Enhanced CLI (Weeks 1-4)

### Week 1: Documentation Generation Command
**Goal:** Add `gitpulse doc <file>` command

Tasks:
1. Create `DocGenerator.tsx` component
2. Implement file reading and analysis
3. Add AI prompt for documentation generation
4. Create Claude Code-style UI for doc display
5. Add command routing in `index.ts`

**Deliverable:** `gitpulse doc src/components/App.tsx` generates AI documentation

### Week 2: Enhanced PR Description Generation
**Goal:** Improve `gitpulse pr` with context-aware descriptions

Tasks:
1. Analyze commit history for patterns
2. Extract file changes and impact analysis
3. Generate comprehensive PR descriptions with:
   - Summary
   - Detailed changes
   - Testing checklist
   - Breaking changes
   - Related issues
4. Add Claude Code-style UI improvements

**Deliverable:** `gitpulse pr` generates detailed, context-aware PR descriptions

### Week 3: Code Analysis Engine
**Goal:** Add AST-based code analysis

Tasks:
1. Install `@babel/parser` and `@babel/types` for AST parsing
2. Create `src/core/analyzer.ts` with:
   - Function extraction
   - Dependency graph generation
   - Complexity analysis
   - Documentation coverage detection
3. Integrate with doc generation command

**Deliverable:** Code analysis engine that identifies undocumented functions

### Week 4: Team Convention Learning
**Goal:** Learn from past PRs to adapt to team style

Tasks:
1. Create `src/core/conventions.ts`
2. Parse past commit messages for patterns
3. Learn:
   - Commit message format (conventional vs custom)
   - PR description structure
   - Code comment style
4. Store learned patterns in local cache

**Deliverable:** AI adapts to team's documentation style

## Phase 2: Distribution Channels (Weeks 5-8)

### Week 5: VSCode Extension Foundation
**Goal:** Create VSCode extension project

Tasks:
1. Initialize VSCode extension structure
2. Set up manifest.json with commands:
   - `gitpulse.generateCommit`
   - `gitpulse.generateDoc`
   - `gitpulse.generatePR`
3. Create extension UI panels
4. Integrate with existing TypeScript core

**Deliverable:** Working VSCode extension with basic commands

### Week 6: VSCode Extension Features
**Goal:** Add intelligent VSCode features

Tasks:
1. Highlight poorly documented functions
2. Show inline documentation suggestions
3. Generate PR descriptions from git diff
4. Add command palette integration
5. Create settings panel

**Deliverable:** Full-featured VSCode extension

### Week 7: GitHub Action
**Goal:** Create GitHub Action for PR automation

Tasks:
1. Create `github-action/` directory
2. Write action.yml with:
   - Event triggers (pull_request, pull_request_target)
   - Inputs for AI provider config
   - Outputs for generated description
3. Implement action script in TypeScript
4. Add PR comment posting logic

**Deliverable:** GitHub Action that auto-generates PR descriptions

### Week 8: Issue Tracker Integration
**Goal:** Add GitHub/Linear/Jira integration

Tasks:
1. Create `src/integrations/github.ts`
2. Implement GitHub API client for:
   - Fetching issue details
   - Linking commits to issues
   - Auto-closing issues on commit
3. Add Linear integration (`src/integrations/linear.ts`)
4. Add Jira integration (`src/integrations/jira.ts`)

**Deliverable:** Issue tracker integration that auto-links commits

## Phase 3: Analytics & Dashboard (Weeks 9-12)

### Week 9: Web Dashboard Foundation
**Goal:** Create web dashboard project

Tasks:
1. Initialize React project with Vite
2. Set up routing and layout
3. Create authentication (GitHub OAuth)
4. Connect to GitPulse API

**Deliverable:** Basic web dashboard structure

### Week 10: Documentation Coverage Metrics
**Goal:** Track and display documentation coverage

Tasks:
1. Implement coverage calculation logic
2. Create coverage visualization charts
3. Add per-file and per-repo metrics
4. Track trends over time

**Deliverable:** Documentation coverage dashboard

### Week 11: Team Analytics
**Goal:** Add team-level analytics

Tasks:
1. Team leaderboard for documentation quality
2. Commit message quality scores
3. PR review time analysis
4. Team convention adherence metrics

**Deliverable:** Team analytics dashboard

### Week 12: Onboarding Assistant
**Goal:** AI helps onboard new team members

Tasks:
1. Generate codebase explanations from git history
2. Create interactive codebase tour
3. Suggest relevant documentation
4. Answer "how does X work?" questions

**Deliverable:** AI-powered onboarding assistant

## Go-To-Market Strategy

### Month 1-2: Build + Launch CLI
- Ship enhanced CLI with doc generation
- Open source core on GitHub
- Daily build updates on Twitter/X
- Target: 1,000 developers using it daily

### Month 3-4: Launch VSCode Extension
- Publish to VSCode Marketplace
- Free tier: 50 AI docs/month
- Paywall at 51st use
- Target: 5,000 installs, 200 paying users

### Month 5-6: Product Hunt + HN Launch
- Launch on Product Hunt
- "Show HN" on Hacker News
- Content marketing: "How to Write Better Commit Messages"
- Target: 10,000 free users, 500 paying users

### Month 7-12: Scale
- Case studies from early teams
- Conference talks
- Word of mouth growth
- Target: $5k-10k MRR

## Success Metrics

### Product Metrics
- Daily Active Users (not signups)
- 7-day retention (target: >40%)
- Time to value (target: <5 minutes)
- Edit rate (target: >60% of AI suggestions accepted)

### Business Metrics
- Free-to-paid conversion (target: 3-5%)
- Churn rate (target: <5% monthly)
- Net revenue retention (target: >100%)

## Next Steps (This Week)

1. ✅ Update README with new positioning
2. Implement `gitpulse doc <file>` command
3. Create code analysis engine foundation
4. Start VSCode extension project structure

## Dependencies to Install

```bash
npm install @babel/parser @babel/types @babel/traverse
npm install @types/babel__parser @types/babel__types
npm install axios # For GitHub/Linear/Jira API calls
```

## Notes

- Keep everything in TypeScript + Ink for CLI
- VSCode extension will be separate project but share core logic
- GitHub Action will use TypeScript core
- Web dashboard will be separate React project
- All projects will share the same `src/core/` and `src/ai/` logic via monorepo or npm package
