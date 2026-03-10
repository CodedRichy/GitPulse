# GitPulse

GitPulse is an automated Git synchronization tool designed to streamline the workflow of developers managing multiple repositories. It monitors file system changes and automatically stages, commits, and pushes updates after a period of inactivity. By automating these repetitive tasks, GitPulse ensures your work is always backed up and synced without manual intervention.

## Features

-   **Multi-Repository Monitoring**: Automatically discovers and watches all Git repositories within a specified root directory.
-   **Smart Debouncing**: Waits for a customizable period of silence (default 60s) before triggering a sync, preventing excessive commits during active coding sessions.
-   **AI-Powered Commit Messages**: Integrates with the Groq API (Llama 3.3 70B) to generate meaningful, context-aware commit summaries based on code diffs.
-   **Dual Interface**:
    -   **GUI Mode**: A clean Tkinter-based dashboard showing the status of all watched repos, last sync times, and error hints.
    -   **CLI Mode**: A terminal-based interface using the `rich` library for live status updates.
-   **Background Mode**: Supports detached execution to keep syncing even after the terminal or editor is closed.
-   **Intelligent Error Handling**: Classifies Git errors (authentication, merge conflicts, network issues) and provides actionable fix suggestions.
-   **Privacy First**: Automatically unstages `.env` files and respects `.gitignore` patterns to prevent accidental leaks of sensitive information.

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

### Environment Variables
To enable AI commit summaries, create a `.env` file next to the script:
```env
GROQ_API_KEY=your_groq_api_key
```

### Configuration File
Create an optional `.gitpulse.json` next to the script to override defaults:
```json
{
  "watch_root": "C:\\Users\\User\\Documents\\GitHub",
  "debounce_seconds": 60
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
