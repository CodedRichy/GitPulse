# GitPulse

A Python file watcher that keeps multiple Git repositories in sync by auto-committing and pushing after a period of inactivity.

## Overview

GitPulse discovers **all Git repos** under a root folder (by default, the parent of the folder containing the script — e.g. your `GitHub` directory). It then:

1. **Quick check at startup** — For each repo, runs `git status --short`. If there are changes, it runs add/commit/push for that repo immediately.
2. **Watches all repos** — A single watcher monitors the root; file events are attributed to the repo they belong to.
3. **Per-repo debounce** — After **60 seconds** of no changes in a given repo, it runs only for that repo:
   - `git add .`
   - `git commit -m "Auto-sync: [timestamp] - [summary]"`
   - `git push origin [current-branch]`

Only the repo that had changes is pushed; others are left untouched.

## Requirements

- Python 3.10+
- Git installed and configured (remote `origin` and branch set) for each repo

## Installation

```bash
pip install -r requirements.txt
```

## Usage

Run from anywhere (default watch root is the **parent** of the directory containing `git-pulse.py`):

```bash
python git-pulse.py
```

Example: if the script lives in `~/GitHub/GitPulse/`, the watch root is `~/GitHub/`. All direct subfolders of `~/GitHub/` that contain a `.git` directory (e.g. `GitPulse`, `my-app`, `other-repo`) are watched. Leave it running; stop with `Ctrl+C`.

- **With Rich:** A live table lists each repo, its branch, and status (countdown to next commit or “Watching” / “Push failed”).
- **Without Rich:** The script still runs and syncs; output is plain text.

## Behavior

| Aspect | Behavior |
|--------|----------|
| **Repos** | All direct subdirectories of the watch root that contain `.git` are included. |
| **Startup** | Each repo is checked for uncommitted changes; if any, that repo is synced (add/commit/push) once before watching. |
| **Debounce** | Per repo: 60 seconds with no file events in that repo before running the Git sequence for it only. |
| **Ignored** | `.git/`, `__pycache__/`, `.git-pulse.log`, `git-pulse.py`, and each repo’s `.gitignore` patterns. |
| **Push failure** | On push error for a repo, that repo is marked failed and won’t auto-push until you fix and run `git push` manually; other repos keep syncing. |
| **Logging** | Messages are appended to `.git-pulse.log` next to the script (e.g. `GitPulse/.git-pulse.log`). |

## License

Copyright (c) 2025 Rishi Praseeth Krishnan. All rights reserved. See [LICENSE](LICENSE) for full terms.
