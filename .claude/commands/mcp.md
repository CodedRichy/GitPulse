---
name: mcp
description: Start MCP server for AI agent integration
---

Start the Model Context Protocol server for IDE integration.

## Usage

```
/mcp [start|config]
```

## Commands

- `start` - Start MCP server (stdio transport)
- `config` - Show MCP configuration

## Tools Exposed

- `analyze_repo` - Repository health
- `suggest_commit` - AI commit messages
- `review_changes` - Quality review
- `run_quality_gates` - Security/smells/coverage/docs
- `validate_commit` - Message validation
- `get_conventions` - Team conventions
- `search_history` - Commit search
- `get_branch_info` - Branch details
- `get_config` - Configuration
- `analyze_file` - File analysis

## IDE Integration

Works with Windsurf, Claude Desktop, Cursor
