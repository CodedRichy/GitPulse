# GitPulse MCP Implementation Checklist

**Quick Reference Guide for Implementation**

---

## Week 1-2: MCP Server Foundation

### Day 1-2: Setup
- [ ] Install MCP SDK: `npm install @modelcontextprotocol/sdk`
- [ ] Create `src/mcp/` directory structure
- [ ] Implement basic MCP server scaffold (`src/mcp/server.ts`)
- [ ] Test server startup with `npx @anthropic-ai/mcp-inspector`

### Day 3-4: Core Tools (First 3)
- [ ] Implement `analyze_repo` tool
  - Returns: status, metrics, health indicators
  - Schema: `{ path: string }` → `{ status, metrics, issues }`
- [ ] Implement `suggest_commit` tool
  - Uses existing commit message generation logic
  - Returns: suggested message + confidence score
- [ ] Implement `review_changes` tool
  - Wraps existing code review functionality
  - Returns: issues array with severity ratings

### Day 5-7: Testing & Refinement
- [ ] Test with Claude Code (add to Claude Desktop config)
- [ ] Test with GitHub Copilot Agent Mode
- [ ] Add error handling and validation
- [ ] Create JSON mode output for all tools

### Day 8-10: Integration
- [ ] Add MCP server entry point (`src/mcp/index.ts`)
- [ ] Update CLI to support `gitpulse mcp` command
- [ ] Create transport layer (STDIO for CLI, SSE optional)
- [ ] Write initial tests

---

## Week 3-4: Quality-First Commit Workflow

### Quality Gates Implementation
- [ ] Create `src/core/quality-gates.ts` module
- [ ] Implement **Security Scan Gate**
  - Detect: hardcoded secrets, SQL injection patterns, XSS vulnerabilities
  - Severity: critical
- [ ] Implement **Code Smells Gate**
  - Detect: god classes, long methods (>50 lines), code duplication
  - Severity: high
- [ ] Implement **Test Coverage Gate**
  - Check: changed files have corresponding test files
  - Severity: medium
- [ ] Implement **Documentation Gate**
  - Check: public functions have JSDoc
  - Severity: medium
- [ ] Implement **Convention Gate**
  - Check: naming matches team patterns (from learned conventions)
  - Severity: low

### Integration with Commit Flow
- [ ] Modify `CommitWizard.tsx` to run quality gates
- [ ] Add `--strict` flag for hard failures
- [ ] Add `--lax` flag for warnings only
- [ ] Display quality score in UI
- [ ] Add "Fix Issues" interactive prompt

---

## Week 5-6: Context-Aware Intelligence

### Convention Learning
- [ ] Create `src/core/convention-learner.ts`
- [ ] Extract commit message patterns from history
- [ ] Extract file naming conventions
- [ ] Identify architectural boundaries (module structure)
- [ ] Store learned conventions in `.gitpulse/conventions.json`

### Context Integration
- [ ] Enhance commit prompts with learned conventions
- [ ] Add "Related Files" detection (files often changed together)
- [ ] Add ADR/Documentation linking (detect references in changes)
- [ ] Implement team-aware suggestions

---

## Week 7: Agent-Native Interface

### JSON Mode
- [ ] Add `--json` flag to all commands
- [ ] Create JSON schemas for all outputs
- [ ] Ensure consistent structure across tools
- [ ] Add streaming JSON support for large outputs

### MCP Resources
- [ ] Implement `repo://status` resource
- [ ] Implement `repo://config` resource
- [ ] Implement `repo://history` resource
- [ ] Implement `repo://quality` resource

---

## Week 8: Testing & Polish

### Testing
- [ ] Unit tests for all MCP tools
- [ ] Integration tests with Claude Code
- [ ] Integration tests with Copilot
- [ ] Performance tests (large repos)

### Documentation
- [ ] Write MCP integration guide
- [ ] Create configuration examples
- [ ] Add troubleshooting section

---

## Week 9-10: Distribution

### Package & Publish
- [ ] Create `@gitpulse/mcp` npm package
- [ ] Add README with setup instructions
- [ ] Create GitHub release
- [ ] Submit to GitHub MCP Registry

### VSCode Extension (Updated)
- [ ] Bundle MCP server with extension
- [ ] Add MCP configuration UI
- [ ] Create quick actions for common tools

---

## Quick Commands Reference

### Start MCP Server
```bash
# Development
npm run mcp:dev

# Production
npx @gitpulse/mcp

# With Claude Desktop
# Add to claude_desktop_config.json:
{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": ["@gitpulse/mcp"]
    }
  }
}
```

### Test MCP Tools
```bash
# Using MCP Inspector
npx @anthropic-ai/mcp-inspector

# Then test:
# - analyze_repo
# - suggest_commit
# - review_changes
```

### Available MCP Tools (After Implementation)

| Tool | Usage |
|------|-------|
| `analyze_repo` | Get repository health and metrics |
| `suggest_commit` | Generate contextual commit message |
| `review_changes` | Quality review of staged changes |
| `suggest_branch` | AI-powered branch name suggestions |
| `explain_file` | Explain file history and purpose |
| `get_commit_history` | Get structured commit history |
| `check_quality` | Run quality gates on changes |

---

## File Structure (After Implementation)

```
src/
├── mcp/
│   ├── server.ts          # MCP server setup
│   ├── tools/
│   │   ├── analyze-repo.ts
│   │   ├── suggest-commit.ts
│   │   ├── review-changes.ts
│   │   ├── suggest-branch.ts
│   │   ├── explain-file.ts
│   │   └── check-quality.ts
│   ├── resources/
│   │   ├── repo-status.ts
│   │   ├── repo-config.ts
│   │   ├── repo-history.ts
│   │   └── repo-quality.ts
│   └── index.ts           # Entry point
├── core/
│   ├── quality-gates.ts   # Quality gate engine
│   └── convention-learner.ts # Team pattern learning
└── commands/
    └── mcp.ts             # CLI command to start MCP server
```

---

## Success Criteria (Per Phase)

### Phase A (MCP Foundation)
- [ ] MCP server starts successfully
- [ ] All 3 core tools respond to requests
- [ ] Works with Claude Desktop
- [ ] Works with Copilot Agent Mode

### Phase B (Quality Gates)
- [ ] Security scan catches 90% of obvious vulnerabilities
- [ ] Code smells detected in test repos
- [ ] Quality score calculated for all changes
- [ ] UI shows quality gates results

### Phase C (Context Awareness)
- [ ] Conventions learned from 100+ commit history
- [ ] Commit suggestions reference team patterns
- [ ] Related files detected automatically

### Phase D (Agent-Native)
- [ ] All commands support `--json` flag
- [ ] JSON output is valid and consistent
- [ ] Resources accessible via MCP protocol

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.4"  // For schema validation
  }
}
```

---

## Configuration Files

### MCP Config (for testing)
`.gitpulse/mcp.json`:
```json
{
  "server": {
    "name": "gitpulse",
    "version": "3.1.0"
  },
  "tools": {
    "enabled": [
      "analyze_repo",
      "suggest_commit",
      "review_changes",
      "suggest_branch",
      "explain_file",
      "check_quality"
    ]
  },
  "quality": {
    "strict": false,
    "gates": {
      "security": { "enabled": true, "severity": "critical" },
      "code_smells": { "enabled": true, "severity": "high" },
      "test_coverage": { "enabled": true, "severity": "medium" },
      "documentation": { "enabled": true, "severity": "medium" },
      "convention": { "enabled": true, "severity": "low" }
    }
  }
}
```

---

## Notes

- **MCP SDK:** Use the official Anthropic SDK (now under Linux Foundation)
- **Transport:** STDIO is simplest for CLI tools, SSE for remote servers
- **Security:** Run quality gates locally, never send code to external services without consent
- **Performance:** Cache analysis results, use incremental checks where possible

---

**Last Updated:** April 2026  
**Status:** Ready to Begin Implementation
