#!/usr/bin/env python3
"""Local file watcher: auto-commit and push after debounced silence."""

from __future__ import annotations

import fnmatch
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

try:
    from rich.console import Console
    from rich.live import Live
    from rich.panel import Panel
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


def get_repo_root() -> Path:
    cur = Path(__file__).resolve().parent
    for _ in range(20):
        if (cur / ".git").exists():
            return cur
        parent = cur.parent
        if parent == cur:
            break
        cur = parent
    return Path(__file__).resolve().parent


REPO_ROOT = get_repo_root()


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


def should_ignore(path: Path, gitignore_patterns: list[str]) -> bool:
    path_str = str(path).replace("\\", "/")
    if "/.git/" in path_str or "/__pycache__/" in path_str or path_str.endswith("/.git") or path_str.endswith("/__pycache__"):
        return True
    if path.name in ALWAYS_IGNORE_FILES:
        return True
    try:
        rel = path.resolve().relative_to(REPO_ROOT)
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


class GitPulseHandler(FileSystemEventHandler):
    def __init__(self, on_activity: callable, gitignore_patterns: list[str]):
        super().__init__()
        self._on_activity = on_activity
        self._gitignore = gitignore_patterns

    def _should_handle(self, src_path: str) -> bool:
        return not should_ignore(Path(src_path), self._gitignore)

    def _dispatch(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._should_handle(event.src_path):
            self._on_activity()

    def on_modified(self, event: FileSystemEvent):
        self._dispatch(event)

    def on_created(self, event: FileSystemEvent):
        self._dispatch(event)

    def on_deleted(self, event: FileSystemEvent):
        self._dispatch(event)


class GitPulse:
    def __init__(self):
        self._lock = threading.Lock()
        self._timer: threading.Timer | None = None
        self._next_commit_time: float | None = None
        self._gitignore = load_gitignore(REPO_ROOT)
        self._branch = get_current_branch(REPO_ROOT)
        self._push_failed = False
        self._console = Console() if RICH_AVAILABLE else None

    def _schedule(self):
        with self._lock:
            if self._timer:
                self._timer.cancel()
            self._next_commit_time = time.monotonic() + DEBOUNCE_SECONDS
            self._timer = threading.Timer(DEBOUNCE_SECONDS, self._on_debounce_elapsed)
            self._timer.daemon = True
            self._timer.start()

    def _on_activity(self):
        if not self._push_failed:
            self._schedule()

    def _on_debounce_elapsed(self):
        with self._lock:
            self._timer = None
            self._next_commit_time = None
        if self._push_failed:
            return
        if not self._branch:
            self._log("No Git branch detected. Skipping auto-sync.")
            return
        success, err = run_git_sequence(REPO_ROOT, self._branch)
        if success:
            self._push_failed = False
            self._log("Auto-sync completed: add, commit, push OK.")
        else:
            self._push_failed = True
            self._log(f"Push failed (will not auto-push until fixed): {err}")
            self._log("Resolve conflicts or network, then run git push manually.")

    def _log(self, msg: str):
        try:
            with (REPO_ROOT / LOG_FILENAME).open("a", encoding="utf-8") as f:
                f.write(f"{datetime.utcnow().isoformat()}Z {msg}\n")
        except OSError:
            pass
        if self._console and RICH_AVAILABLE:
            style = "red" if "failed" in msg.lower() or "error" in msg.lower() else "green"
            self._console.print(f"[{style}]{msg}[/{style}]")
        else:
            print(msg)

    def get_seconds_until_commit(self) -> float | None:
        with self._lock:
            if self._next_commit_time is None or self._push_failed:
                return None
            return max(0.0, self._next_commit_time - time.monotonic())

    def _build_panel(self):
        secs = self.get_seconds_until_commit()
        if self._push_failed:
            return Panel(
                "[red]Push failed. Resolve manually (e.g. git push).[/red]\n"
                "Watching for changes; no auto-commit until push succeeds.",
                title="Git Pulse",
                border_style="red",
            )
        if secs is not None and secs > 0:
            m, s = divmod(int(secs), 60)
            return Panel(
                f"Repo: [cyan]{REPO_ROOT}[/cyan]\n"
                f"Branch: [cyan]{self._branch or '(none)'}[/cyan]\n"
                f"Next auto-commit in: [bold yellow]{m}:{s:02d}[/bold yellow] (60s silence)\n"
                "[dim]Modify a file to reset the timer.[/dim]",
                title="[bold]Git Pulse[/bold]",
                border_style="blue",
                box=box.ROUNDED,
            )
        return Panel(
            f"Repo: [cyan]{REPO_ROOT}[/cyan]\n"
            f"Branch: [cyan]{self._branch or '(none)'}[/cyan]\n"
            "[green]Watching — waiting for changes (60s silence to commit)[/green]",
            title="[bold]Git Pulse[/bold]",
            border_style="blue",
            box=box.ROUNDED,
        )

    def run(self):
        handler = GitPulseHandler(self._on_activity, self._gitignore)
        observer = Observer()
        observer.schedule(handler, str(REPO_ROOT), recursive=True)
        observer.start()
        if not RICH_AVAILABLE:
            print("Install 'rich' for color countdown. Running without Rich.")
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
