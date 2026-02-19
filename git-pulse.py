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
from datetime import datetime
from pathlib import Path
from tkinter import ttk

try:
    from plyer import notification as plyer_notification
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


CONFIG_FILENAME = ".gitpulse.json"

ERROR_FIXES = {
    "auth": "One-time fix: In any terminal run 'git config --global credential.helper store'. Then run 'git push' once in a repo and sign in; Git saves to a file. After that GitPulse works from anywhere (including Cursor).",
    "network": "Check internet and VPN; retry later or run 'git push' manually.",
    "merge": "Pull first: open repo, run 'git pull', fix conflicts, then push. Retry here after.",
    "no_remote": "Add remote: run 'git remote add origin <url>' in that repo.",
    "config": "Set identity: run 'git config user.name \"Your Name\"' and 'git config user.email \"you@example.com\"'.",
    "add": "Check file permissions and lock files in that repo; close editors that may lock files.",
    "commit": "Check commit hooks and repo state; run 'git status' in that repo.",
    "timeout": "Network slow or repo large; increase timeout or push manually.",
    "unknown": "See .git-pulse.log for details; fix then use Retry.",
}


def classify_error(err_text: str) -> tuple[str, str]:
    if not err_text:
        return "unknown", ERROR_FIXES["unknown"]
    t = err_text.lower()
    if "credential" in t or "authentication" in t or "permission denied" in t or "sec_e_no_credentials" in t or "403" in t or "could not read username" in t:
        return "auth", ERROR_FIXES["auth"]
    if "timeout" in t or "timed out" in t or "connection" in t or "unreachable" in t or "could not resolve" in t:
        return "network", ERROR_FIXES["network"]
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
    if "timeout" in t or "timed out" in t:
        return "timeout", ERROR_FIXES["timeout"]
    return "unknown", ERROR_FIXES["unknown"]


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


def run_git_sequence(root: Path, branch: str) -> tuple[bool, str, str]:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    summary = get_changed_files_summary(root)
    message = f"Auto-sync: {ts} - {summary}"
    try:
        env = os.environ.copy()
        add = subprocess.run(["git", "add", "."], cwd=root, capture_output=True, text=True, timeout=30, env=env)
        if add.returncode != 0:
            err = add.stderr or add.stdout or "git add failed"
            kind, _ = classify_error(err)
            return False, err, kind
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
            err_short = err[:200] + "…" if len(err) > 200 else err
            self._last_error[repo] = (err_short, fix, kind)
            self._log(f"{repo.name}: Push failed ({kind}) — {err}", repo)
            self._log(f"  Fix: {fix}", repo)

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
                err_short = err[:200] + "…" if len(err) > 200 else err
                self._last_error[repo] = (err_short, fix, kind)
                self._log(f"{repo.name}: Startup sync failed ({kind}) — {err}")
                self._log(f"  Fix: {fix}", repo)

    def get_seconds_until_commit(self, repo: Path) -> float | None:
        with self._lock:
            if self._next_commit_time.get(repo) is None or self._push_failed.get(repo, False):
                return None
            return max(0.0, self._next_commit_time[repo] - time.monotonic())

    def get_status_rows(self) -> list[tuple[str, str, str, str, str]]:
        out = []
        for repo in self._repos:
            name = repo.name
            branch = self._branch.get(repo) or "(none)"
            if self._push_failed.get(repo, False):
                entry = self._last_error.get(repo, ("", ERROR_FIXES["unknown"], "unknown"))
                err_snippet, fix, kind = entry[0], entry[1], entry[2] if len(entry) > 2 else "unknown"
                status = f"Failed ({kind})"
                fix_short = (fix[:70] + "…") if len(fix) > 70 else fix
            else:
                secs = self.get_seconds_until_commit(repo)
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
            root.geometry("380x120")
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
        tk.Label(header, text=f"Watching {len(self._repos)} repo(s)", font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT)
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
                    err_short = err[:200] + "…" if len(err) > 200 else err
                    self._last_error[repo] = (err_short, fix, kind)
                    self._log(f"{repo.name}: Retry failed ({kind}) — {err}")
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
        root.after(1500, lambda: _tick(root))

        def _tick(w):
            if not w.winfo_exists():
                return
            refresh()
            w.after(1500, lambda: _tick(w))

        root.mainloop()


def main():
    app = GitPulse()
    if len(sys.argv) > 1 and sys.argv[1] in ("--cli", "--terminal"):
        app.run()
    else:
        app.run_with_gui()


if __name__ == "__main__":
    main()
