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

A **small window** opens with repo status; **close the window to stop.** Terminal: `python git-pulse.py --cli`.

- **Double-click** a repo row to open its folder in Explorer (or your file manager).
- **Refresh repos** — Button rescans the watch root so new clones appear without restarting.
- **Last pushed** — Column shows when each repo was last successfully pushed (e.g. “Just now”, “2 min ago”).
- **Desktop notifications** — If you `pip install plyer`, a system notification is shown when a repo pushes successfully.

### Config (optional)

Create `.gitpulse.json` in the same folder as `git-pulse.py` to override defaults:

```json
{
  "watch_root": "C:\\Users\\you\\Documents\\GitHub",
  "debounce_seconds": 60
}
```

`watch_root` is the folder whose direct subfolders are scanned for Git repos. `debounce_seconds` must be at least 10.

## Behavior

| Aspect | Behavior |
|--------|----------|
| **Repos** | All direct subdirectories of the watch root that contain `.git` are included. |
| **Startup** | Each repo is checked for uncommitted changes; if any, that repo is synced (add/commit/push) once before watching. |
| **Debounce** | Per repo: 60 seconds with no file events in that repo before running the Git sequence for it only. |
| **Ignored** | `.git/`, `__pycache__/`, `.git-pulse.log`, `git-pulse.py`, and each repo’s `.gitignore` patterns. |
| **Push failure** | On push error for a repo, that repo is marked failed; the **Fix** column and log show what to do. Use **Retry selected** after fixing. Other repos keep syncing. |
| **Logging** | Messages are appended to `.git-pulse.log` next to the script (e.g. `GitPulse/.git-pulse.log`). |

### Error handling

Failures are classified and a short **Fix** is shown in the GUI and log:

| Error type | What to do |
|------------|------------|
| **Auth** | Sign in: run `git push` in that repo and enter credentials, or set up Git Credential Manager. |
| **Network** | Check internet/VPN; retry later or push manually. |
| **Merge** | Pull first in that repo (`git pull`), fix conflicts, push; then **Retry selected** in Git Pulse. |
| **No remote** | Run `git remote add origin <url>` in that repo. |
| **Config** | Set `git config user.name` and `git config user.email` in that repo. |
| **Add/commit** | Check permissions and lock files; close editors that lock files. |

Invalid `.gitpulse.json` or missing watch root is ignored (defaults used). If the watcher cannot start (e.g. permission), an error dialog is shown.

### Root cause: "Push failed" / SEC_E_NO_CREDENTIALS

**What’s going on:** Git push over HTTPS needs credentials. Windows uses SChannel and the credential store. If you see `SEC_E_NO_CREDENTIALS` or "Push failed (auth)", it means **no credentials were available to the process** that ran `git push`.

**Why it happens:**

1. **Credentials never stored** — You haven’t run `git push` from a normal terminal and signed in, so nothing is saved in Windows Credential Manager.
2. **GitPulse started in a restricted context** — When GitPulse is run from Cursor’s “run in background” or an automated task, the process often can’t use the same credential store as an interactive terminal, so Git gets “no credentials”.

**Fix (pick one; Option A is best so GitPulse works from anywhere):**

- **Option A — One-time: save credentials to a file (then GitPulse works from Cursor too):**  
  1. In **any** terminal (Cursor’s is fine), run:  
     `git config --global credential.helper store`  
  2. In any repo run `git push origin main` once and sign in when prompted.  
  3. Git saves your login to a file. After that, GitPulse will work from Cursor or anywhere without asking again.

- **Option B — Use a normal terminal each time:**  
  Always run GitPulse from PowerShell/CMD (not Cursor), after doing one `git push` there to sign in.

- **Option C — Use SSH instead of HTTPS:**  
  In each repo: `git remote set-url origin git@github.com:USER/REPO.git`. Push then uses SSH keys (no password popup) if your key is on GitHub.

The app shows **Failed (auth)** and a **Fix** column with this guidance.

## License

Copyright (c) 2025 Rishi Praseeth Krishnan. All rights reserved. See [LICENSE](LICENSE) for full terms.
