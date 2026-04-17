# GitPulse MCP Usage Guide

**Version:** 3.1.0  
**Last Updated:** April 14, 2026

---

## What is MCP?

MCP (Model Context Protocol) is a standard that allows AI assistants to use external tools and resources. GitPulse exposes its git intelligence as an MCP server, making it available to AI agents in Windsurf, Claude Desktop, and other MCP-compatible tools.

---

## Quick Setup

### Windsurf

Add to your `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": [
        "-y",
        "pulse",
        "mcp",
        "start"
      ]
    }
  }
}
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": [
        "-y",
        "pulse",
        "mcp",
        "start"
      ]
    }
  }
}
```

### Local Installation

If you have GitPulse installed globally:

```json
{
  "mcpServers": {
    "gitpulse": {
      "command": "pulse",
      "args": [
        "mcp",
        "start"
      ]
    }
  }
}
```

---

## Available Tools

### 1. analyze_repo

Analyze repository status, health, and metrics.

**Parameters:**
- `path` (optional): Path to repository (defaults to current directory)

**Returns:**
```json
{
  "isRepository": true,
  "branch": "main",
  "status": {
    "staged": 3,
    "unstaged": 5,
    "untracked": 2,
    "isClean": false
  },
  "sync": {
    "ahead": 2,
    "behind": 0
  },
  "health": 85
}
```

**Usage Example (in Windsurf):**
```
"Analyze this repository using GitPulse"
```

---

### 2. suggest_commit

Generate AI-powered commit message for staged changes.

**Parameters:**
- `context` (optional): Additional context for the commit
- `path` (optional): Path to repository

**Returns:**
```json
{
  "message": "feat(core): add quality gates engine",
  "confidence": 0.95,
  "reasoning": [
    "Added security scan, code smells, test coverage, and documentation gates",
    "Implements Phase B of MCP integration"
  ]
}
```

**Usage Example (in Windsurf):**
```
"Generate a commit message using GitPulse"
"Suggest a commit message for my staged changes"
```

---

### 3. review_changes

Perform quality review on staged changes.

**Parameters:**
- `target` (optional): What to review (staged, unstaged, last-commit)
- `path` (optional): Path to repository

**Returns:**
```json
{
  "summary": "Found 2 critical issues and 5 warnings",
  "issues": [
    {
      "severity": "critical",
      "category": "security",
      "message": "Hardcoded API key detected",
      "file": "src/config.ts",
      "line": 15
    }
  ],
  "formatted": "Full formatted output for display"
}
```

**Usage Example (in Windsurf):**
```
"Review my staged changes with GitPulse"
"Check my code for quality issues"
```

---

## Available Resources

### repo://status

Get current repository status.

**Usage (in Windsurf):**
```
"Get the repository status from GitPulse"
```

**Returns:**
```json
{
  "branch": "main",
  "staged": ["file1.ts", "file2.ts"],
  "unstaged": ["file3.ts"],
  "untracked": ["newfile.ts"],
  "isClean": false
}
```

### repo://config

Get GitPulse configuration.

**Usage (in Windsurf):**
```
"Show GitPulse configuration"
```

**Returns:**
```json
{
  "aiProvider": "ollama",
  "commitStyle": "conventional",
  "model": "llama3.2"
}
```

---

## Common Use Cases

### 1. Before Committing

Ask the AI to:
```
"Review my staged changes with GitPulse, then suggest a commit message"
```

This will:
1. Run quality gates on your changes
2. Check for security issues, code smells, etc.
3. Generate a contextual commit message
4. Use your team's conventions

### 2. Understanding Repository Health

```
"Analyze this repository with GitPulse and tell me about its health"
```

This will:
1. Check repository status
2. Assess overall health score
3. Identify potential issues
4. Provide actionable insights

### 3. Getting Context

```
"Get the repository status from GitPulse and summarize what's changed"
```

This will:
1. Fetch current status
2. List staged, unstaged, and untracked files
3. Provide a summary of changes

---

## Quality Gates Integration

When you use GitPulse MCP tools, quality gates are automatically applied:

- **Security Scan** - Detects hardcoded secrets, SQL injection, XSS
- **Code Smells** - Finds long functions, TODOs, console.log
- **Test Coverage** - Checks for missing tests
- **Documentation** - Validates JSDoc coverage

The AI will alert you to issues before suggesting commits.

---

## Context-Aware Intelligence

GitPulse learns your team's conventions:

1. **Naming Conventions** - camelCase, PascalCase, etc.
2. **Commit Patterns** - Common types and scopes
3. **Architecture** - Module boundaries and layer patterns
4. **File Relationships** - Files that change together

This context is automatically used when:
- Generating commit messages
- Reviewing code
- Providing suggestions

---

## Troubleshooting

### Server Not Starting

If the MCP server fails to start:

1. Check GitPulse is installed:
```bash
npx -y pulse --version
```

2. Test the MCP command:
```bash
npx -y pulse mcp config
```

3. Check for port conflicts (if using SSE transport)

### Tools Not Available

If tools aren't showing up:

1. Restart your IDE (Windsurf, Claude Desktop)
2. Check the MCP config file syntax
3. Verify the command path is correct
4. Check IDE logs for errors

### Path Issues

If the server can't find the repository:

1. Use absolute paths in tool calls
2. Ensure the repository is a git repo
3. Check file permissions

---

## Advanced Configuration

### Environment Variables

Set environment variables for the MCP server:

```json
{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": [
        "-y",
        "gitpulse",
        "mcp",
        "start"
      ],
      "env": {
        "AI_PROVIDER": "openai",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### Custom Model Configuration

Configure specific AI models:

```json
{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": [
        "-y",
        "gitpulse",
        "mcp",
        "start"
      ],
      "env": {
        "AI_PROVIDER": "ollama",
        "OLLAMA_MODEL": "llama3.2"
      }
    }
  }
}
```

---

## Testing MCP Integration

### Using MCP Inspector

Test the MCP server independently:

```bash
npx @anthropic-ai/mcp-inspector
```

Then connect to GitPulse and test tools.

### Manual Testing

Test specific tools:

```bash
# Test MCP config
pulse mcp config

# Start server manually (for debugging)
pulse mcp start
```

---

## Best Practices

1. **Always review before committing** - Quality gates catch issues, but human review is still important
2. **Use context in prompts** - Provide additional context when asking for commit messages
3. **Check quality scores** - Pay attention to quality gate scores and fix critical issues
4. **Leverage conventions** - Let GitPulse learn your team's patterns for better suggestions
5. **Keep GitPulse updated** - Regular updates bring new features and improvements

---

## Integration Examples

### Example 1: Full Workflow

```
User: "Analyze my repo with GitPulse"
AI: [Shows repo health and status]

User: "Review my staged changes"
AI: [Shows quality gate results with issues]

User: "Suggest a commit message"
AI: [Generates contextual commit message using team conventions]

User: "Commit that message"
AI: [Executes commit]
```

### Example 2: Quick Commit

```
User: "Commit my changes with GitPulse"
AI: [Automatically runs quality gates, suggests message, commits]
```

### Example 3: Code Review

```
User: "Review my code with GitPulse"
AI: [Shows quality issues, suggests fixes, uses team conventions]
```

---

## Support

For issues or questions:

- Check documentation: `docs/mcp-integration-complete-summary.md`
- Run: `pulse mcp config` for configuration help
- Review logs in your IDE for detailed error messages

---

**GitPulse v3.1.0 - MCP Integration Complete**
