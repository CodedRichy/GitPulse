# GitPulse

Auto-commit and push multiple Git repos after a short period of inactivity. One window, zero manual commits.

## What it does

- **Discovers repos** — Scans a root folder (default: parent of the script, e.g. your `GitHub` folder) for direct subfolders that contain `.git`.
- **Startup sync** — For each repo with uncommitted changes, runs add/commit/push once before watching.
- **Watches all** — Single watcher; file events are attributed to the right repo.
- **Per-repo debounce** — After **60 seconds** with no changes in a repo, runs only for that repo:
  - `git add .` (then unstages `.env` so it is never committed)
  - `git commit -m "Auto-sync: [files]"` with body from Groq summary or diff shortstat
  - `git push origin [branch]`

Only the repo that had changes is pushed.

## Requirements

- Python 3.10+
- Git installed (remote `origin` and branch set per repo)

## Install

```bash
pip install -r requirements.txt
```

## Run

```bash
python git-pulse.py
```

A **window** opens with a table of repos (branch, status, last pushed, fix hint). **Close the window to stop.**

- **Terminal UI:** `python git-pulse.py --cli` (stop with Ctrl+C)
- **Double-click** a row to open that repo’s folder.
- **Refresh repos** — Rescan so new clones appear.
- **Retry selected** — Retry push for the selected repo (selection is remembered when you click the button).
- **Desktop notifications** — Optional: `pip install plyer` for a notification on successful push.

## Optional: AI commit summary

Set `GROQ_API_KEY` in a `.env` file next to `git-pulse.py`. GitPulse loads it at startup and uses Groq to summarize the staged diff as the commit message body. Without the key, it uses the diff shortstat. **`.env` is in `.gitignore`** and the script unstages `.env` before every commit, so your key is never committed or pushed.

## Config

Optional `.gitpulse.json` next to `git-pulse.py`:

```json
{
  "watch_root": "C:\\Users\\you\\Documents\\GitHub",
  "debounce_seconds": 60
}
```

`debounce_seconds` must be between 10 and 86400.

## Behavior

| Item | Detail |
|------|--------|
| Repos | Direct subdirs of watch root that contain `.git`. |
| Ignored | `.git/`, `__pycache__/`, `.git-pulse.log`, `git-pulse.py`, `.env`, and each repo’s `.gitignore`. `.env` is always unstaged before commit. |
| Auth failure | **auth**; auto-retry once after 5s. Store credentials once (see below) and it recovers. |
| Rules (GH013) | **rules** — GitHub repo rules block push to main. In repo Settings → Rules, allow direct push or use another branch. |
| Other failures | **Fix** column and `.git-pulse.log` show a short hint. Use **Retry selected** after fixing. |
| Log | `.git-pulse.log` next to the script. |

## Credentials (one-time)

If you see **Failed (auth)** (e.g. SEC_E_NO_CREDENTIALS), Git has no credentials in that run. Do this once:

1. `git config --global credential.helper store`
2. In any repo: `git push origin main` (or your branch) and sign in when prompted.

Git saves credentials to a file. After that, GitPulse works from Cursor or anywhere. Auth failures also trigger one automatic retry after 5 seconds.

**Alternative:** Use SSH: `git remote set-url origin git@github.com:USER/REPO.git` so push uses your SSH key.

## License

Copyright (c) 2025 Rishi Praseeth Krishnan. All rights reserved. See [LICENSE](LICENSE) for full terms.
