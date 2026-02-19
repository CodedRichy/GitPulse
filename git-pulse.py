#!/usr/bin/env python3
"""Local file watcher: auto-commit and push after debounced silence. Multi-repo support."""

from __future__ import annotations

import fnmatch
import subprocess
import sys
import threading
import time
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import ttk

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


def get_script_dir() -> Path:
    return Path(__file__).resolve().parent


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


def find_repo_for_path(path: Path, repo_roots: list[Path]) -> Path | None:
    try:
        resolved = path.resolve()
    except OSError:
        return None
    for repo in repo_roots:
        try:
            resolved.relative_to(repo)
            return repo
        except ValueError:
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


def run_git_sequence(root: Path, branch: str) -> tuple[bool, str]:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    summary = get_changed_files_summary(root)
    message = f"Auto-sync: {ts} - {summary}"
    try:
        add = subprocess.run(["git", "add", "."], cwd=root, capture_output=True, text=True, timeout=30)
        if add.returncode != 0:
            return False, add.stderr or add.stdout or "git add failed"
        commit = subprocess.run(
            ["git", "commit", "-m", message], cwd=root, capture_output=True, text=True, timeout=30
        )
        if commit.returncode != 0:
            out = (commit.stdout or "") + (commit.stderr or "")
            if "nothing to commit" in out:
                return True, ""
            return False, commit.stderr or commit.stdout or "git commit failed"
        push = subprocess.run(
            ["git", "push", "origin", branch], cwd=root, capture_output=True, text=True, timeout=120
        )
        if push.returncode != 0:
            return False, push.stderr or push.stdout or "git push failed"
        return True, ""
    except subprocess.TimeoutExpired as e:
        return False, f"Timeout: {e}"
    except Exception as e:
        return False, str(e)


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
        self._watch_root = watch_root or get_repos_root()
        self._repos = find_git_repos(self._watch_root)
        self._lock = threading.Lock()
        self._timers: dict[Path, threading.Timer] = {}
        self._next_commit_time: dict[Path, float] = {}
        self._push_failed: dict[Path, bool] = {}
        self._branch: dict[Path, str | None] = {}
        self._gitignore: dict[Path, list[str]] = {}
        for repo in self._repos:
            self._push_failed[repo] = False
            self._branch[repo] = get_current_branch(repo)
            self._gitignore[repo] = load_gitignore(repo)
        self._log_path = get_script_dir() / LOG_FILENAME
        self._console = Console() if RICH_AVAILABLE else None

    def _schedule(self, repo: Path):
        with self._lock:
            if repo in self._timers and self._timers[repo]:
                self._timers[repo].cancel()
            self._next_commit_time[repo] = time.monotonic() + DEBOUNCE_SECONDS
            t = threading.Timer(DEBOUNCE_SECONDS, self._on_debounce_elapsed, args=(repo,))
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
        if self._push_failed.get(repo, False):
            return
        branch = self._branch.get(repo)
        if not branch:
            self._log(f"{repo.name}: No branch. Skipping.", repo)
            return
        success, err = run_git_sequence(repo, branch)
        if success:
            self._push_failed[repo] = False
            self._log(f"{repo.name}: Pushed.", repo)
        else:
            self._push_failed[repo] = True
            self._log(f"{repo.name}: Push failed — {err}", repo)

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
            success, err = run_git_sequence(repo, branch)
            if success:
                self._log(f"{repo.name}: Startup sync pushed.")
            else:
                self._push_failed[repo] = True
                self._log(f"{repo.name}: Startup sync failed — {err}")

    def get_seconds_until_commit(self, repo: Path) -> float | None:
        with self._lock:
            if self._next_commit_time.get(repo) is None or self._push_failed.get(repo, False):
                return None
            return max(0.0, self._next_commit_time[repo] - time.monotonic())

    def get_status_rows(self) -> list[tuple[str, str, str]]:
        out = []
        for repo in self._repos:
            name = repo.name
            branch = self._branch.get(repo) or "(none)"
            if self._push_failed.get(repo, False):
                status = "Push failed — fix manually"
            else:
                secs = self.get_seconds_until_commit(repo)
                if secs is not None and secs > 0:
                    m, s = divmod(int(secs), 60)
                    status = f"Commit in {m}:{s:02d}"
                else:
                    status = "Watching"
            out.append((name, branch, status))
        return out

    def _build_panel(self):
        if not self._repos:
            return Panel(
                f"No Git repos found under [cyan]{self._watch_root}[/cyan]\n"
                "Create subfolders with .git or set a different root.",
                title="Git Pulse",
                border_style="yellow",
            )
        table = Table(box=box.SIMPLE, show_header=True, header_style="bold")
        table.add_column("Repo", style="cyan")
        table.add_column("Branch", style="dim")
        table.add_column("Status")
        for repo in self._repos:
            name = repo.name
            branch = self._branch.get(repo) or "(none)"
            if self._push_failed.get(repo, False):
                status = "[red]Push failed — fix manually[/red]"
            else:
                secs = self.get_seconds_until_commit(repo)
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


def main():
    GitPulse().run()


if __name__ == "__main__":
    main()
