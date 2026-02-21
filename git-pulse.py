#!/usr/bin/env python3
"""Local file watcher: auto-commit and push after debounced silence. Multi-repo support."""

from __future__ import annotations

import fnmatch
import json
import os
import subprocess
import sys
import threading
import time
import tkinter as tk
import urllib.request
from datetime import datetime
from pathlib import Path
from tkinter import ttk

try:
    from plyer import notification as plyer_notification  # pyright: ignore[reportMissingImports]
    NOTIFY_AVAILABLE = True
except ImportError:
    NOTIFY_AVAILABLE = False

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

try:
    from rich.console import Console
    from rich.live import Live
    from rich.panel import Panel
    from rich.table import Table
    from rich import box
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

DEBOUNCE_SECONDS = 60
LOG_FILENAME = ".git-pulse.log"
SCRIPT_NAME = "git-pulse.py"
ALWAYS_IGNORE_DIRS = (".git", "__pycache__")
ALWAYS_IGNORE_FILES = (LOG_FILENAME, SCRIPT_NAME)
LIVE_REFRESH_RATE = 2
GUI_REFRESH_MS = 1500
CATCH_UP_EVERY_N_TICKS = 4  # Run catch-up every N GUI ticks (~6s when GUI_REFRESH_MS=1500)

CONFIG_FILENAME = ".gitpulse.json"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
MIN_DIFF_FOR_SUMMARY = 200  # Minimum diff size (chars) to trigger GROQ summary
MAX_DIFF_FOR_SUMMARY = 4000  # Maximum diff size to send to GROQ

# Rate limiting for GROQ API
GROQ_RATE_LIMIT = 10  # Max 10 requests per minute
GROQ_RATE_WINDOW = 60  # Time window in seconds
_groq_request_times: list[float] = []


def load_dotenv(script_dir: Path) -> None:
    env_file = script_dir / ".env"
    if not env_file.exists():
        return
    try:
        for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                key = k.strip()
                if key:
                    os.environ[key] = v.strip()
    except OSError:
        pass

ERROR_FIXES = {
    "auth": "Run: git config --global credential.helper store, then git push once and sign in.",
    "network": "Check internet/VPN; push manually if needed.",
    "merge": "Run git pull in repo, fix conflicts, then push.",
    "rules": "GitHub repo rules block push to main. Settings → Rules → allow direct push or use another branch.",
    "no_remote": "Run: git remote add origin <url>",
    "config": "Set: git config user.name and user.email",
    "add": "Check permissions/lock files; close editors.",
    "commit": "Check hooks/repo state; run git status.",
    "timeout": "Push manually or retry later.",
    "unknown": "See .git-pulse.log; fix and Retry.",
}


def classify_error(err_text: str) -> tuple[str, str]:
    if not err_text:
        return "unknown", ERROR_FIXES["unknown"]
    t = err_text.lower()
    if "credential" in t or "authentication" in t or "permission denied" in t or "sec_e_no_credentials" in t or "403" in t or "could not read username" in t:
        return "auth", ERROR_FIXES["auth"]
    if "timeout" in t or "timed out" in t:
        return "timeout", ERROR_FIXES["timeout"]
    if "connection" in t or "unreachable" in t or "could not resolve" in t:
        return "network", ERROR_FIXES["network"]
    if "gh013" in t or "repository rule" in t or "rule violations" in t:
        return "rules", ERROR_FIXES["rules"]
    if "rejected" in t or "non-fast-forward" in t or "pull" in t or "diverged" in t or "merge" in t:
        return "merge", ERROR_FIXES["merge"]
    if "no such remote" in t or "origin" in t and "does not appear" in t:
        return "no_remote", ERROR_FIXES["no_remote"]
    if "user.name" in t or "user.email" in t or "identity" in t:
        return "config", ERROR_FIXES["config"]
    if "add" in t and ("failed" in t or "error" in t or "permission" in t):
        return "add", ERROR_FIXES["add"]
    if "commit" in t and ("failed" in t or "error" in t or "hook" in t):
        return "commit", ERROR_FIXES["commit"]
    return "unknown", ERROR_FIXES["unknown"]


def _format_error_display(err: str, max_len: int = 80) -> str:
    """First line of error, truncated, for UI/log."""
    if not err:
        return ""
    first = err.split("\n")[0].strip()
    return first[:max_len] + ("…" if len(first) > max_len else "")


def get_script_dir() -> Path:
    return Path(__file__).resolve().parent


def load_config() -> dict:
    path = get_script_dir() / CONFIG_FILENAME
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {}
        out = {}
        if data.get("watch_root"):
            p = Path(str(data["watch_root"]).strip())
            if p.is_dir():
                out["watch_root"] = str(p.resolve())
            elif p.exists():
                pass
            else:
                try:
                    resolved = p.resolve()
                    if resolved.is_dir():
                        out["watch_root"] = str(resolved)
                except (OSError, RuntimeError):
                    pass
        if "debounce_seconds" in data:
            try:
                sec = int(data["debounce_seconds"])
                if 10 <= sec <= 86400:
                    out["debounce_seconds"] = sec
            except (TypeError, ValueError):
                pass
        return out
    except (json.JSONDecodeError, OSError):
        return {}


def get_repos_root() -> Path:
    script_dir = get_script_dir()
    parent = script_dir.parent
    if (script_dir / ".git").exists():
        return parent
    return script_dir


def find_git_repos(root: Path) -> list[Path]:
    if not root.is_dir():
        return []
    return sorted(
        p for p in root.iterdir()
        if p.is_dir() and (p / ".git").exists()
    )


def open_folder(path: Path):
    try:
        path = path.resolve()
        if not path.is_dir():
            return
        if os.name == "nt":
            os.startfile(path)
        elif sys.platform == "darwin":
            subprocess.run(["open", path], check=False, capture_output=True)
        else:
            subprocess.run(["xdg-open", path], check=False, capture_output=True)
    except OSError:
        pass


def format_last_pushed(dt: datetime | None) -> str:
    if dt is None:
        return "—"
    delta = datetime.utcnow() - dt
    secs = delta.total_seconds()
    if secs < 60:
        return "Just now"
    if secs < 3600:
        return f"{int(secs / 60)} min ago"
    if secs < 86400:
        return f"{int(secs / 3600)} hr ago"
    return f"{int(secs / 86400)} d ago"


def find_repo_for_path(path: Path, repo_roots: list[Path]) -> Path | None:
    try:
        resolved = path.resolve()
    except OSError:
        return None
    for repo in repo_roots:
        try:
            repo_resolved = repo.resolve()
            resolved.relative_to(repo_resolved)
            return repo
        except (ValueError, OSError):
            continue
    return None


def load_gitignore(root: Path) -> list[str]:
    gitignore = root / ".gitignore"
    if not gitignore.exists():
        return []
    return [
        line.strip()
        for line in gitignore.read_text(encoding="utf-8", errors="replace").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


def path_matches_gitignore(rel_path: str, gitignore_patterns: list[str]) -> bool:
    path_str = rel_path.replace("\\", "/")
    parts = path_str.split("/")
    for pattern in gitignore_patterns:
        if fnmatch.fnmatch(path_str, pattern) or fnmatch.fnmatch(path_str, f"**/{pattern}"):
            return True
        for part in parts:
            if fnmatch.fnmatch(part, pattern):
                return True
    return False


def should_ignore(path: Path, repo_root: Path, gitignore_patterns: list[str]) -> bool:
    path_str = str(path).replace("\\", "/")
    if "/.git/" in path_str or "/__pycache__/" in path_str or path_str.endswith("/.git") or path_str.endswith("/__pycache__"):
        return True
    if path.name in ALWAYS_IGNORE_FILES:
        return True
    try:
        rel = path.resolve().relative_to(repo_root)
    except (ValueError, OSError):
        return True
    rel_str = str(rel).replace("\\", "/")
    for part in rel.parts:
        if part in ALWAYS_IGNORE_DIRS:
            return True
    return path_matches_gitignore(rel_str, gitignore_patterns)


def get_current_branch(root: Path) -> str | None:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if r.returncode == 0 and r.stdout:
            return r.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def has_changes(root: Path) -> bool:
    try:
        r = subprocess.run(
            ["git", "status", "--short"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=5,
        )
        return r.returncode == 0 and bool(r.stdout and r.stdout.strip())
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def get_changed_files_summary(root: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "status", "--short"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if r.returncode != 0 or not r.stdout.strip():
            return "changes"
        lines = r.stdout.strip().splitlines()[:10]
        names = []
        for line in lines:
            line = line.strip()
            if len(line) > 2:
                names.append(Path(line[3:].strip().split(" -> ")[-1]).name)
        summary = ", ".join(names[:5])
        if len(lines) > 5:
            summary += f" (+{len(lines) - 5} more)"
        return summary or "changes"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return "changes"


def get_diff_shortstat(root: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "diff", "--cached", "--shortstat"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if r.returncode == 0 and r.stdout and r.stdout.strip():
            return r.stdout.strip()
        return ""
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return ""


def get_diff_cached(root: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "diff", "--cached"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if r.returncode == 0 and r.stdout:
            out = r.stdout.strip()
            return out[:MAX_DIFF_FOR_SUMMARY] + ("…" if len(out) > MAX_DIFF_FOR_SUMMARY else "")
        return ""
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return ""


def groq_summarize_diff(diff: str) -> str | None:
    global _groq_request_times
    key = os.environ.get("GROQ_API_KEY")
    if not key or not diff.strip():
        return None
    
    # Only summarize substantial changes to avoid unnecessary API calls
    if len(diff) < MIN_DIFF_FOR_SUMMARY:
        return None
    
    # Rate limiting check
    now = time.time()
    _groq_request_times = [t for t in _groq_request_times if now - t < GROQ_RATE_WINDOW]
    if len(_groq_request_times) >= GROQ_RATE_LIMIT:
        return None  # Rate limit exceeded, skip this request
    
    prompt = "Summarize this git diff in one sentence for a commit message. No quotes, no prefix, just the sentence.\n\n" + diff
    body = json.dumps({
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 80,
        "temperature": 0.2,
    }).encode("utf-8")
    req = urllib.request.Request(
        GROQ_API_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        _groq_request_times.append(time.time())  # Record successful request
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content")
        if content and isinstance(content, str):
            return content.strip()[:200]
        return None
    except Exception:
        return None


def run_git_sequence(root: Path, branch: str) -> tuple[bool, str, str]:
    summary = get_changed_files_summary(root)
    try:
        env = os.environ.copy()
        home = os.path.expanduser("~")
        if home:
            env.setdefault("HOME", home)
            if os.name == "nt":
                env.setdefault("USERPROFILE", home)
        add = subprocess.run(["git", "add", "."], cwd=root, capture_output=True, text=True, timeout=30, env=env)
        if add.returncode != 0:
            err = add.stderr or add.stdout or "git add failed"
            kind, _ = classify_error(err)
            return False, err, kind
        subprocess.run(["git", "reset", "HEAD", "--", ".env"], cwd=root, capture_output=True, timeout=5, env=env)
        diff = get_diff_cached(root)
        groq_desc = groq_summarize_diff(diff) if diff and os.environ.get("GROQ_API_KEY") else None
        if groq_desc:
            message = f"Auto-sync: {summary}\n\n{groq_desc}"
        else:
            shortstat = get_diff_shortstat(root)
            if shortstat:
                message = f"Auto-sync: {summary}\n\n{shortstat}"
            else:
                message = f"Auto-sync: {summary}"
        commit = subprocess.run(
            ["git", "commit", "-m", message], cwd=root, capture_output=True, text=True, timeout=30, env=env
        )
        if commit.returncode != 0:
            out = (commit.stdout or "") + (commit.stderr or "")
            if "nothing to commit" in out:
                return True, "", ""
            err = commit.stderr or commit.stdout or "git commit failed"
            kind, _ = classify_error(err)
            return False, err, kind
        push = subprocess.run(
            ["git", "push", "origin", branch], cwd=root, capture_output=True, text=True, timeout=120, env=env
        )
        if push.returncode != 0:
            err = push.stderr or push.stdout or "git push failed"
            kind, _ = classify_error(err)
            return False, err, kind
        return True, "", ""
    except subprocess.TimeoutExpired as e:
        return False, f"Timeout: {e}", "timeout"
    except Exception as e:
        return False, str(e), "unknown"


class MultiRepoHandler(FileSystemEventHandler):
    def __init__(self, repo_roots: list[Path], on_activity: callable):
        super().__init__()
        self._repo_roots = repo_roots
        self._on_activity = on_activity
        self._gitignore_cache: dict[Path, list[str]] = {}

    def _gitignore_for(self, repo: Path) -> list[str]:
        if repo not in self._gitignore_cache:
            self._gitignore_cache[repo] = load_gitignore(repo)
        return self._gitignore_cache[repo]

    def _dispatch(self, event: FileSystemEvent):
        if event.is_directory:
            return
        path = Path(event.src_path)
        repo = find_repo_for_path(path, self._repo_roots)
        if repo is None:
            return
        if should_ignore(path, repo, self._gitignore_for(repo)):
            return
        self._on_activity(repo)

    def on_modified(self, event: FileSystemEvent):
        self._dispatch(event)

    def on_created(self, event: FileSystemEvent):
        self._dispatch(event)

    def on_deleted(self, event: FileSystemEvent):
        self._dispatch(event)


class GitPulse:
    def __init__(self, watch_root: Path | None = None):
        config = load_config()
        raw_root = config.get("watch_root") or (str(watch_root) if watch_root else None) or str(get_repos_root())
        self._watch_root = Path(raw_root).resolve()
        if not self._watch_root.is_dir():
            self._watch_root = get_repos_root().resolve()
        self._debounce_seconds = max(10, int(config.get("debounce_seconds", DEBOUNCE_SECONDS)))
        self._repos = find_git_repos(self._watch_root)
        self._lock = threading.Lock()
        self._timers: dict[Path, threading.Timer] = {}
        self._next_commit_time: dict[Path, float] = {}
        self._push_failed: dict[Path, bool] = {}
        self._last_error: dict[Path, tuple[str, str, str]] = {}
        self._branch: dict[Path, str | None] = {}
        self._gitignore: dict[Path, list[str]] = {}
        self._last_pushed: dict[Path, datetime] = {}
        for repo in self._repos:
            self._push_failed[repo] = False
            self._branch[repo] = get_current_branch(repo)
            self._gitignore[repo] = load_gitignore(repo)
        self._log_path = get_script_dir() / LOG_FILENAME
        self._console = Console() if RICH_AVAILABLE else None
        self._auth_retry_scheduled: set[Path] = set()

    def _schedule_auth_retry(self, repo: Path):
        if repo in self._auth_retry_scheduled:
            return
        self._auth_retry_scheduled.add(repo)
        def run():
            if repo not in self._repos:
                self._auth_retry_scheduled.discard(repo)
                return
            branch = self._branch.get(repo)
            if not branch:
                self._auth_retry_scheduled.discard(repo)
                return
            success, err, kind = run_git_sequence(repo, branch)
            self._auth_retry_scheduled.discard(repo)
            if success:
                self._push_failed[repo] = False
                self._last_error.pop(repo, None)
                self._last_pushed[repo] = datetime.utcnow()
                self._log(f"{repo.name}: Auto-retry pushed.")
            else:
                self._push_failed[repo] = True
                fix = ERROR_FIXES.get(kind, ERROR_FIXES["unknown"])
                self._last_error[repo] = (_format_error_display(err), fix, kind)
        t = threading.Timer(5, run)
        t.daemon = True
        t.start()

    def _schedule(self, repo: Path):
        with self._lock:
            if repo in self._timers and self._timers[repo]:
                self._timers[repo].cancel()
            self._next_commit_time[repo] = time.monotonic() + self._debounce_seconds
            t = threading.Timer(self._debounce_seconds, self._on_debounce_elapsed, args=(repo,))
            t.daemon = True
            self._timers[repo] = t
            t.start()

    def _on_activity(self, repo: Path):
        if self._push_failed.get(repo, False):
            return
        self._schedule(repo)

    def _on_debounce_elapsed(self, repo: Path):
        with self._lock:
            self._timers.pop(repo, None)
            self._next_commit_time.pop(repo, None)
        if repo not in self._repos:
            return
        if self._push_failed.get(repo, False):
            return
        branch = self._branch.get(repo)
        if not branch:
            self._log(f"{repo.name}: No branch. Skipping.", repo)
            return
        success, err, kind = run_git_sequence(repo, branch)
        if success:
            self._push_failed[repo] = False
            self._last_error.pop(repo, None)
            self._last_pushed[repo] = datetime.utcnow()
            self._log(f"{repo.name}: Pushed.", repo)
            if NOTIFY_AVAILABLE:
                try:
                    plyer_notification.notify(title="Git Pulse", message=f"{repo.name} pushed", app_name="Git Pulse")
                except Exception:
                    pass
        else:
            self._push_failed[repo] = True
            fix = ERROR_FIXES.get(kind, ERROR_FIXES["unknown"])
            err_display = _format_error_display(err)
            self._last_error[repo] = (err_display, fix, kind)
            self._log(f"{repo.name}: {kind} — {err_display}", repo)
            if kind == "auth":
                self._schedule_auth_retry(repo)

    def _log(self, msg: str, repo: Path | None = None):
        try:
            with self._log_path.open("a", encoding="utf-8") as f:
                f.write(f"{datetime.utcnow().isoformat()}Z {msg}\n")
        except OSError:
            pass
        if self._console and RICH_AVAILABLE:
            style = "red" if "failed" in msg.lower() or "error" in msg.lower() else "green"
            self._console.print(f"[{style}]{msg}[/{style}]")
        else:
            print(msg)

    def _quick_check_repos(self):
        for repo in self._repos:
            if self._push_failed.get(repo, False):
                continue
            if not has_changes(repo):
                continue
            branch = self._branch.get(repo)
            if not branch:
                continue
            success, err, kind = run_git_sequence(repo, branch)
            if success:
                self._last_pushed[repo] = datetime.utcnow()
                self._log(f"{repo.name}: Startup sync pushed.")
            else:
                self._push_failed[repo] = True
                fix = ERROR_FIXES.get(kind, ERROR_FIXES["unknown"])
                self._last_error[repo] = (_format_error_display(err), fix, kind)
                self._log(f"{repo.name}: {kind} — {_format_error_display(err)}", repo)
                if kind == "auth":
                    self._schedule_auth_retry(repo)

    def get_seconds_until_commit(self, repo: Path) -> float | None:
        with self._lock:
            if self._next_commit_time.get(repo) is None or self._push_failed.get(repo, False):
                return None
            return max(0.0, self._next_commit_time[repo] - time.monotonic())

    def _get_all_seconds_until_commit(self) -> dict[Path, float | None]:
        """One lock for all repos; returns repo -> seconds left or None."""
        now = time.monotonic()
        with self._lock:
            return {
                repo: (max(0.0, self._next_commit_time[repo] - now) if self._next_commit_time.get(repo) and not self._push_failed.get(repo, False) else None)
                for repo in self._repos
            }

    def _catch_up_pending_changes(self) -> None:
        """If the file watcher missed an event, start countdown when repo has changes."""
        with self._lock:
            need_check = [
                r for r in self._repos
                if not self._push_failed.get(r, False) and self._next_commit_time.get(r) is None
            ]
        for repo in need_check:
            if has_changes(repo):
                self._schedule(repo)

    def get_status_rows(self) -> list[tuple[str, str, str, str, str]]:
        secs_map = self._get_all_seconds_until_commit()
        out = []
        for repo in self._repos:
            name = repo.name
            branch = self._branch.get(repo) or "(none)"
            if self._push_failed.get(repo, False):
                entry = self._last_error.get(repo, ("", ERROR_FIXES["unknown"], "unknown"))
                _, fix, kind = entry[0], entry[1], entry[2] if len(entry) > 2 else "unknown"
                status = f"Failed ({kind})"
                fix_short = (fix[:50] + "…") if len(fix) > 50 else fix
            else:
                secs = secs_map.get(repo)
                if secs is not None and secs > 0:
                    m, s = divmod(int(secs), 60)
                    status = f"Commit in {m}:{s:02d}"
                    fix_short = "—"
                else:
                    status = "Watching"
                    fix_short = "—"
            last = format_last_pushed(self._last_pushed.get(repo))
            out.append((name, branch, status, last, fix_short))
        return out

    def _build_panel(self):
        if not self._repos:
            return Panel(
                f"No Git repos found under [cyan]{self._watch_root}[/cyan]\n"
                "Create subfolders with .git or set a different root.",
                title="Git Pulse",
                border_style="yellow",
            )
        secs_map = self._get_all_seconds_until_commit()
        table = Table(box=box.SIMPLE, show_header=True, header_style="bold")
        table.add_column("Repo", style="cyan")
        table.add_column("Branch", style="dim")
        table.add_column("Status")
        for repo in self._repos:
            name = repo.name
            branch = self._branch.get(repo) or "(none)"
            if self._push_failed.get(repo, False):
                entry = self._last_error.get(repo, ("", "", "unknown"))
                kind = entry[2] if len(entry) > 2 else "unknown"
                status = f"[red]Failed ({kind}) — see Fix[/red]"
            else:
                secs = secs_map.get(repo)
                if secs is not None and secs > 0:
                    m, s = divmod(int(secs), 60)
                    status = f"[yellow]Commit in {m}:{s:02d}[/yellow]"
                else:
                    status = "[green]Watching[/green]"
            table.add_row(name, branch, status)
        return Panel(
            table,
            title=f"[bold]Git Pulse[/bold] — watching {len(self._repos)} repo(s) under [cyan]{self._watch_root}[/cyan]",
            border_style="blue",
            box=box.ROUNDED,
        )

    def run(self):
        if not self._repos:
            if RICH_AVAILABLE:
                Console().print(self._build_panel())
            else:
                print(f"No Git repos under {self._watch_root}")
            return
        self._quick_check_repos()
        handler = MultiRepoHandler(self._repos, self._on_activity)
        observer = Observer()
        observer.schedule(handler, str(self._watch_root), recursive=True)
        observer.start()
        if not RICH_AVAILABLE:
            print("Install 'rich' for live status. Running without Rich.")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                pass
            observer.stop()
            observer.join()
            return
        console = Console()
        try:
            with Live(console=console, refresh_per_second=LIVE_REFRESH_RATE) as live:
                while True:
                    time.sleep(1 / LIVE_REFRESH_RATE)
                    live.update(self._build_panel())
        except KeyboardInterrupt:
            pass
        observer.stop()
        observer.join()
        console.print("[yellow]Stopped.[/yellow]")

    def run_with_gui(self):
        if not self._watch_root.is_dir():
            root = tk.Tk()
            root.title("Git Pulse")
            root.withdraw()
            tk.messagebox.showerror("Git Pulse", f"Watch root is not a directory:\n{self._watch_root}\nFix .gitpulse.json or run from a valid path.")
            root.destroy()
            return
        if not self._repos:
            root = tk.Tk()
            root.title("Git Pulse")
            root.geometry("400x150")
            root.resizable(True, False)
            tk.Label(root, text=f"No Git repos under\n{self._watch_root}", font=("Segoe UI", 10)).pack(pady=20, padx=20)
            root.mainloop()
            return
        self._quick_check_repos()
        handler = MultiRepoHandler(self._repos, self._on_activity)
        self._observer = Observer()
        try:
            self._observer.schedule(handler, str(self._watch_root), recursive=True)
            self._observer.start()
        except (OSError, PermissionError) as e:
            root = tk.Tk()
            root.withdraw()
            tk.messagebox.showerror("Git Pulse", f"Cannot watch folder:\n{self._watch_root}\n{e}\nCheck path and permissions.")
            root.destroy()
            return

        root = tk.Tk()
        root.title("Git Pulse")
        root.geometry("420x280")
        root.resizable(True, True)
        root.minsize(360, 200)

        header = tk.Frame(root)
        header.pack(fill=tk.X, padx=8, pady=6)
        count_label = tk.Label(header, text=f"Watching {len(self._repos)} repo(s)", font=("Segoe UI", 10, "bold"))
        count_label.pack(side=tk.LEFT)
        tk.Label(header, text="Close window to stop", font=("Segoe UI", 8), fg="gray").pack(side=tk.RIGHT)

        tree_frame = tk.Frame(root)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0, 8))
        tree = ttk.Treeview(tree_frame, columns=("branch", "status", "last", "fix"), show=("tree", "headings"), height=10)
        tree.heading("#0", text="Repo")
        tree.column("#0", width=100, minwidth=70)
        tree.heading("branch", text="Branch")
        tree.column("branch", width=90, minwidth=50)
        tree.heading("status", text="Status")
        tree.column("status", width=90, minwidth=60)
        tree.heading("last", text="Last pushed")
        tree.column("last", width=80, minwidth=60)
        tree.heading("fix", text="Fix")
        tree.column("fix", width=200, minwidth=120)
        scroll = ttk.Scrollbar(tree_frame)
        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        tree.config(yscrollcommand=scroll.set)
        scroll.config(command=tree.yview)

        def refresh():
            count_label.config(text=f"Watching {len(self._repos)} repo(s)")
            for i in tree.get_children():
                tree.delete(i)
            for repo, (name, branch, status, last, fix) in zip(self._repos, self.get_status_rows()):
                tree.insert("", tk.END, iid=str(repo.resolve()), text=name, values=(branch, status, last, fix))

        def on_double_click(_):
            sel = tree.selection()
            if not sel:
                return
            try:
                open_folder(Path(sel[0]))
            except Exception:
                pass

        tree.bind("<Double-1>", on_double_click)

        last_selected_iid: list[str | None] = [None]

        def _on_select(_):
            sel = tree.selection()
            if sel:
                last_selected_iid[0] = sel[0]

        tree.bind("<<TreeviewSelect>>", _on_select)

        def do_refresh():
            self._repos.clear()
            self._repos.extend(find_git_repos(self._watch_root))
            for repo in self._repos:
                if repo not in self._branch:
                    self._branch[repo] = get_current_branch(repo)
                    self._push_failed[repo] = False
                    self._gitignore[repo] = load_gitignore(repo)
            refresh()

        def do_retry():
            sel = tree.selection()
            if not sel and last_selected_iid[0]:
                sel = [last_selected_iid[0]]
            if not sel:
                return
            try:
                target = Path(sel[0]).resolve()
                repo = next((r for r in self._repos if r.resolve() == target), None)
                if repo is None:
                    return
                self._push_failed[repo] = False
                self._last_error.pop(repo, None)
                branch = self._branch.get(repo)
                if not branch:
                    refresh()
                    return
                success, err, kind = run_git_sequence(repo, branch)
                if success:
                    self._last_pushed[repo] = datetime.utcnow()
                    self._log(f"{repo.name}: Retry pushed.")
                else:
                    self._push_failed[repo] = True
                    fix = ERROR_FIXES.get(kind, ERROR_FIXES["unknown"])
                    err_display = _format_error_display(err)
                    self._last_error[repo] = (err_display, fix, kind)
                    self._log(f"{repo.name}: Retry {kind} — {err_display}", repo)
                refresh()
            except Exception:
                refresh()

        btn_frame = tk.Frame(root)
        btn_frame.pack(fill=tk.X, padx=8, pady=(0, 6))
        ttk.Button(btn_frame, text="Refresh repos", command=do_refresh).pack(side=tk.LEFT)
        ttk.Button(btn_frame, text="Retry selected", command=do_retry).pack(side=tk.LEFT, padx=(8, 0))

        def on_closing():
            self._observer.stop()
            self._observer.join()
            root.destroy()
            sys.exit(0)

        root.protocol("WM_DELETE_WINDOW", on_closing)
        refresh()
        tick_count: list[int] = [0]
        root.after(GUI_REFRESH_MS, lambda: _tick(root))

        def _tick(w):
            if not w.winfo_exists():
                return
            tick_count[0] += 1
            if tick_count[0] % CATCH_UP_EVERY_N_TICKS == 0:
                self._catch_up_pending_changes()
            refresh()
            w.after(GUI_REFRESH_MS, lambda: _tick(w))

        root.mainloop()


def _launch_detached() -> None:
    """Re-launch this script as a detached background process (survives IDE close)."""
    script = Path(__file__).resolve()
    if os.name == "nt":
        # Windows: use pythonw if available (no console), otherwise python
        pythonw = Path(sys.executable).parent / "pythonw.exe"
        exe = str(pythonw) if pythonw.exists() else sys.executable
        # DETACHED_PROCESS (0x8) + CREATE_NO_WINDOW (0x08000000)
        creationflags = 0x00000008 | 0x08000000
        subprocess.Popen(
            [exe, str(script)],
            creationflags=creationflags,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        # Unix: start_new_session detaches from terminal
        subprocess.Popen(
            [sys.executable, str(script)],
            start_new_session=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    print("GitPulse launched in background. You can close this terminal.")


def main():
    load_dotenv(get_script_dir())
    if len(sys.argv) > 1 and sys.argv[1] in ("--detach", "--background", "-d"):
        _launch_detached()
        return
    app = GitPulse()
    if len(sys.argv) > 1 and sys.argv[1] in ("--cli", "--terminal"):
        app.run()
    else:
        app.run_with_gui()


if __name__ == "__main__":
    main()
