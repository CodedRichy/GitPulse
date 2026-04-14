# GitPulse Architecture

## System Design

GitPulse is a TypeScript CLI application that uses Ink (React for terminal) to provide an interactive terminal UI. The application integrates with multiple AI providers to generate commit messages, PR descriptions, and code documentation.

### Core Principles

- **Local-First**: Code never leaves the local machine when using local AI models
- **Multi-Provider**: Support for Ollama, OpenRouter, and OpenAI
- **Context-Aware**: Understands codebase context and team conventions
- **Learning**: Adapts to user preferences over time

## Module Structure

```
GitPulse v3.0 (TypeScript + Ink)
├── src/
│   ├── index.ts              # CLI entry point
│   ├── components/           # React Ink UI components
│   ├── core/                 # Git operations & models
│   ├── ai/                   # AI provider integrations
│   ├── auth/                 # Authentication
│   ├── commands/             # CLI commands
│   └── utils/                # Configuration & helpers
├── web/                      # Next.js web dashboard
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

- **git.ts**: Git operations (status, diff, commit, history)
- **models.ts**: Data models and types
- **analyzer.ts**: Code analysis engine (planned)
  - AST parsing
  - Function extraction
  - Dependency graph generation
  - Documentation coverage detection

### `src/ai/`
AI provider integrations:

- **providers.ts**: Multi-provider AI client (Ollama, OpenRouter, OpenAI)
- **learning.ts**: Real-time learning from user corrections
- **prompts.ts**: Prompt templates (planned)

### `src/auth/`
Authentication and database:

- **database.ts**: User data and configuration storage

### `src/commands/`
CLI command implementations:

- **branch.ts**: Branch management commands
- **index.ts**: Command router
- **init.ts**: Project initialization

### `src/utils/`
Utility functions:

- **config.ts**: Configuration management
- **ast-parser.ts**: AST parsing utilities (planned)

### `web/`
Next.js web dashboard for team analytics (separate project):

- **app/**: Next.js app router pages
- **lib/**: Shared utilities and Supabase client
- **public/**: Static assets

## Data Flow

### Commit Message Generation
```
1. User runs: gitpulse commit
2. CLI reads git status and diff
3. AI provider analyzes changes
4. Context is built from:
   - File changes
   - Past commit history
   - Team conventions (learned)
5. AI generates commit message
6. User reviews and edits (optional)
7. Commit is created
8. Learning system stores user corrections
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
│ - status    │──────────────────►│ - StatusPanel      │
│ - doc       │──────────────────►│ - ExplainView      │
│ - pr        │──────────────────►│ - PRGenerator      │
│ - config    │──────────────────►│ - ConfigPanel      │
└──────┬──────┘                   └──────────┬─────────┘
       │                                     │
       │                                     │
┌──────▼──────┐                   ┌──────────▼─────────┐
│   core/     │◄──────────────────│                    │
│             │                   │                    │
│ - git.ts    │                   │                    │
│ - models.ts │                   │                    │
│ - analyzer  │                   │                    │
└──────┬──────┘                   └────────────────────┘
       │
       │
┌──────▼──────┐
│     ai/     │
│             │
│ - providers │◄──────► AI APIs (Ollama, OpenRouter, OpenAI)
│ - learning  │
└─────────────┘
```

## Configuration Management

Configuration is stored in:
- `.env` file for AI provider settings
- `.gitpulse/config.json` for project-specific settings
- Local cache for learned patterns

## Integration Points

### Git Integration
- Uses `simple-git` library for Git operations
- Supports all Git workflows (feature branches, PRs, etc.)

### AI Provider Integration
- **Ollama**: Local models, zero cost, privacy-first
- **OpenRouter**: Cloud models, multiple options
- **OpenAI**: GPT models for advanced features

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

## Security Considerations

- API keys stored in `.env` (never committed)
- Code never leaves local machine with Ollama
- Optional pre-commit hooks for security scanning
- Pattern matching for secret detection

## Performance Optimization

- Lazy loading of AI providers
- Caching of AI responses
- Async operations for non-blocking UI
- Minimal dependencies for fast startup
