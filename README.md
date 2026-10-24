# GitPulse

A TypeScript CLI that checks your staged changes against quality gates and your team's commit conventions, and writes the commit message for you. Built for developers who commit code written with Copilot, Cursor, Windsurf or Claude Code.

![GitPulse Banner](assets/GitPulseBanner.png)

[![CI](https://github.com/CodedRichy/GitPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/CodedRichy/GitPulse/actions)

## What it does

- Four quality gates run on staged changes: security scan (hardcoded secrets, SQL injection, XSS, path traversal), code smells, missing tests, and missing JSDoc on exports.
- `gitpulse commit` drafts a commit message from the diff and the conventions it learned from your history.
- Also drafts PR descriptions and documentation, and reviews staged changes.
- Runs as an MCP server, so other AI tools can call `analyze_repo`, `suggest_commit` and `review_changes`.
- Runs on pull requests as a GitHub Action.
- Model providers: Ollama, OpenRouter, OpenAI, Google and Groq.

## Status

Version 0.1.0, still in development. The CLI and MCP server are the working parts. The web dashboard (Next.js and Supabase) is optional and unfinished. The GitHub Action's compiled entry point, `action/dist/index.js`, is not committed, so the Action needs a build before it can run from this repo. Roadmap items such as a VSCode extension are not started.

## Stack

TypeScript, Ink, simple-git, Vitest, the Model Context Protocol SDK. Next.js 16 and Supabase for the dashboard.

## Run it

Needs Node.js 18 or newer. Ollama is optional, for local models.

```bash
git clone https://github.com/CodedRichy/GitPulse.git
cd GitPulse
npm install
npm run build
npm link        # optional, puts gitpulse on your PATH
```

Create a `.env` in the project root:

```bash
AI_PROVIDER=ollama              # ollama, openrouter, openai, google, groq
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
COMMIT_STYLE=conventional       # conventional, semantic, simple
# cloud providers: OPENROUTER_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, GOOGLE_API_KEY
```

Then, in a git repository:

```bash
gitpulse init                   # installs hooks, creates .gitpulse/config.json
gitpulse commit                 # gates + generated message
gitpulse commit --strict        # block on any issue
gitpulse commit --dry-run       # preview only
gitpulse review staged
gitpulse pr
gitpulse mcp start
```

MCP config for tools that support it:

```json
{
  "mcpServers": {
    "gitpulse": {
      "command": "npx",
      "args": ["-y", "gitpulse", "mcp", "start"]
    }
  }
}
```

GitHub Action, as declared in `action.yml`:

```yaml
name: Quality Gates
on: [pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: CodedRichy/GitPulse@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          strict: 'true'
```

Other inputs are `comment`, `gates` and `fail-on`. Outputs are `passed`, `score`, `issues` and `report`.

Tests: `npm test`. Type check: `npm run typecheck`.

The earlier, longer README (architecture, every command, config, deployment) is kept in [`docs/README-FULL.md`](docs/README-FULL.md).

## License

See the LICENSE file. Its text is a proprietary notice: all rights reserved, source visible for reference only, and no license granted to modify, distribute or use commercially without written permission. SPDX: `LicenseRef-Proprietary`.
