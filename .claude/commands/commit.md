---
name: commit
description: Generate smart commit message with AI quality gates
---

Generate an AI-powered commit message for staged changes. Runs quality gates (security scan, code smells, test coverage, documentation) before committing.

## Usage

```
/commit [--strict] [--lax] [--dry-run]
```

## Options

- `--strict` - Block commit if quality gates fail
- `--lax` - Skip quality gate warnings
- `--dry-run` - Preview without committing

## Quality Gates

1. **Security Scan** - Detects secrets, SQL injection, XSS
2. **Code Smells** - Long functions, TODOs, console.log
3. **Test Coverage** - Missing tests for changed files
4. **Documentation** - Missing JSDoc on exports
