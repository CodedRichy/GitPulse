# GitPulse

A Python file watcher that keeps a Git repository in sync with the remote by auto-committing and pushing after a period of inactivity.

## Overview

GitPulse monitors the repository directory for file changes (create, modify, delete). After **60 seconds** with no new events, it runs:

1. `git add .`
2. `git commit -m "Auto-sync: [timestamp] - [summary of changed files]"`
3. `git push origin [current-branch]`

The debounce prevents commit spam from rapid edits. The script ignores `.git/`, `__pycache__/`, entries in `.gitignore`, and its own log file so it does not react to its own activity.

## Requirements

- Python 3.10+
- Git installed and configured (remote `origin` and branch set)

## Installation

```bash
pip install -r requirements.txt
```

## Usage

From the repository root:

```bash
python git-pulse.py
```

Leave it running while you work. Stop with `Ctrl+C`.

- **With Rich installed:** A live panel shows repo path, branch, and a countdown to the next auto-commit. Each file change resets the 60-second timer.
- **Without Rich:** The script still runs and syncs; output is plain text.

## Behavior

| Aspect | Behavior |
|--------|----------|
| **Debounce** | 60 seconds of no file events before running the Git sequence |
| **Ignored** | `.git/`, `__pycache__/`, `.git-pulse.log`, `git-pulse.py`, and all paths matching `.gitignore` |
| **Push failure** | On push error (e.g. merge conflict, network), the script logs the error and stops auto-pushing. Resolve the issue and run `git push` manually; the watcher continues and will auto-push again on the next successful cycle. |
| **Logging** | Events and errors are appended to `.git-pulse.log` in the repo root (this file is ignored by the watcher and in `.gitignore`). |

## License

MIT
