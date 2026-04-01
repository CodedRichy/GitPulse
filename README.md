# GitPulse 🚀

**The Privacy-First, Fully Automated Git Commit Assistant**

GitPulse is an intelligent Git automation tool that watches your repositories and automatically generates meaningful commit messages using local or cloud AI. Unlike GitHub Copilot, your code never leaves your machine when using local AI models.

## ✨ Key Features

### 🤖 **Multi-Provider AI Support**
-   **Local AI (Ollama)** - Privacy-first, zero cost, works offline
-   **OpenAI GPT** - Cloud-based, high quality
-   **Anthropic Claude** - Advanced reasoning
-   **Automatic Fallback** - Tries each provider until one succeeds

### 📊 **Smart Automation**
-   **Multi-Repository Monitoring** - Watch unlimited repos simultaneously
-   **Intelligent Debouncing** - Waits for coding silence (default 60s) before committing
-   **Context-Aware Messages** - AI analyzes git diffs, not entire files
-   **Selective Watching** - Respects `.gitignore` and custom patterns

### 🎨 **Flexible Interface**
-   **GUI Mode** - Clean dashboard with real-time status
-   **CLI Mode** - Rich terminal interface for remote work
-   **Background Mode** - Runs silently in system tray

### 🛡️ **Enterprise-Ready**
-   **Privacy First** - Local AI keeps code on your machine
-   **Error Recovery** - Smart classification and auto-retry
-   **Analytics** - Track productivity and AI accuracy
-   **Secure** - Auto-excludes `.env` and sensitive files

## Architecture

GitPulse operates as a lightweight background process with three primary stages:

1.  **Observation**: A single `watchdog` observer monitors events across all target repositories.
2.  **Evaluation**: Events are mapped to their respective repositories. If a change is detected, a debounced timer starts. Any subsequent change resets the timer.
3.  **Synchronization**: Once the timer expires, the tool executes a sequence of:
    -   `git add .`
    -   `git reset .env` (precautionary)
    -   Groq API call for commit summary (if configured and diff is significant)
    -   `git commit -m "[Auto-sync]"`
    -   `git push origin [branch]`

## Tech Stack

-   **Language**: Python 3.10+
-   **Core Libraries**:
    -   `watchdog`: Cross-platform file system events.
    -   `rich`: Professional CLI output and live table formatting.
    -   `tkinter`: Native GUI framework for the dashboard.
-   **APIs**: Groq Cloud (Llama 3.3 70B) for LLM-based commit generation.
-   **OS Integration**: `subprocess` for Git CLI interaction, `threading` for concurrent monitoring.

## Repository Structure

Explain the purpose of major folders and important files:

```
/docs
  /ARCHITECTURE.md  → Inferred system structure history
  /CHANGELOG.md     → Development timeline
  /DEVELOPMENT.md   → Detailed commit history documentation
git-pulse.py        → Main application entry point and logic
requirements.txt    → Python dependencies
LICENSE             → Proprietary license terms
.gitpulse.json      → (Optional) User configuration
.git-pulse.log      → Application runtime logs
.git-pulse.lock     → Single-instance execution lock
```

## Installation

### Prerequisites

-   Python 3.10 or higher.
-   Git installed and configured with a remote `origin` for each repository.

### Dependency Installation

```bash
pip install -r requirements.txt
```

*Optional: To enable desktop notifications on successful push:*
```bash
pip install plyer
```

## Usage

### Running the Dashboard (GUI)
By default, GitPulse opens a window with a status table:
```bash
python git-pulse.py
```

### CLI Mode
For a live terminal-based view (useful for SSH or remote environments):
```bash
python git-pulse.py --cli
```

### Background Mode
To launch GitPulse as an independent process that keeps running after the terminal is closed:
```bash
python git-pulse.py --detach
```

## Configuration

### AI Provider Setup

#### Option 1: Local AI (Recommended - Free & Private)
Install Ollama and pull a model:
```bash
# Install Ollama from https://ollama.ai
ollama pull qwen3.5:9b
```

#### Option 2: Cloud AI (Optional)
Add API keys to `.env` file:
```env
# OpenAI (optional)
OPENAI_API_KEY=sk-...

# Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-...
```

### Configuration File
Create `.gitpulse.json` to customize settings:
```json
{
  "watch_root": "C:\\Users\\User\\Documents\\GitHub",
  "debounce_seconds": 60,
  "ai_provider": "ollama",
  "ollama_model": "qwen3.5:9b",
  "openai_model": "gpt-4o-mini",
  "anthropic_model": "claude-3-haiku-20240307",
  "min_diff_for_summary": 200,
  "max_diff_for_summary": 1500,
  "enable_analytics": true,
  "commit_preview": false,
  "theme": "system"
}
```

## Development

Developers can contribute by:
-   **Running in Dev Mode**: Use `python git-pulse.py --cli` for real-time log output in the terminal.
-   **Linting**: The codebase follows standard Python PEP8 patterns where possible.
-   **Logging**: All internal actions and Git errors are logged to `.git-pulse.log`.

## Testing

Tests are currently conducted manually by:
-   Verifying file event detection across different operating systems.
-   Simulating Git errors (auth, conflicts) to verify the "Fix" suggestions.
-   Checking `.git-pulse.log` for sync sequence integrity.

## Deployment

GitPulse is a portable script. To "deploy" it, simply place `git-pulse.py` and `requirements.txt` in your desired directory and run it. For persistent execution on Windows, use the `--detach` flag or add it to your Startup folder.

## Roadmap

- [ ] Support for multiple LLM providers (OpenAI, Anthropic).
- [ ] Customizable commit message templates and prefixes.
- [ ] Tray icon support for minimized background execution.
- [ ] Per-repo configuration for debounce and branch targets.

## Contributing

Basic contribution guidelines:
1.  Fork the repository (if applicable).
2.  Create a feature branch for your changes.
3.  Ensure your code adheres to the single-file architecture.
4.  Submit a pull request with a clear description of the enhancement.

## License

Copyright (c) 2025 Rishi Praseeth Krishnan. All rights reserved.

This repository and its source code are made visible for viewing and reference only. No license is granted to use, copy, modify, distribute, or create derivative works from this software without express written permission from the copyright holder. See [LICENSE](LICENSE) for full terms.
