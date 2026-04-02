"""Commit preview feature for GitPulse."""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Optional


class CommitPreview:
    """Preview commits before pushing."""
    
    def __init__(self, repo_path: Path):
        self.repo_path = repo_path
    
    def get_staged_changes(self) -> dict:
        """Get details of staged changes."""
        try:
            # Get list of staged files
            result = subprocess.run(
                ["git", "diff", "--cached", "--name-status"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            files = []
            if result.returncode == 0 and result.stdout:
                for line in result.stdout.strip().split("\n"):
                    if line:
                        parts = line.split("\t", 1)
                        if len(parts) == 2:
                            status, filename = parts
                            files.append({
                                "status": status,
                                "filename": filename,
                                "status_text": self._get_status_text(status)
                            })
            
            # Get diff stats
            stats_result = subprocess.run(
                ["git", "diff", "--cached", "--shortstat"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            stats = stats_result.stdout.strip() if stats_result.returncode == 0 else ""
            
            # Get full diff
            diff_result = subprocess.run(
                ["git", "diff", "--cached"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            diff = diff_result.stdout if diff_result.returncode == 0 else ""
            
            return {
                "files": files,
                "stats": stats,
                "diff": diff,
                "file_count": len(files)
            }
        except Exception:
            return {
                "files": [],
                "stats": "",
                "diff": "",
                "file_count": 0
            }
    
    def _get_status_text(self, status: str) -> str:
        """Convert git status code to readable text."""
        status_map = {
            "M": "Modified",
            "A": "Added",
            "D": "Deleted",
            "R": "Renamed",
            "C": "Copied",
            "U": "Updated"
        }
        return status_map.get(status, status)
    
    def generate_preview_message(self, ai_message: str, changes: dict) -> str:
        """Generate a preview message for the commit."""
        file_list = "\n".join([f"  {f['status_text']}: {f['filename']}" for f in changes["files"][:10]])
        if changes["file_count"] > 10:
            file_list += f"\n  ... and {changes['file_count'] - 10} more files"
        
        preview = f"""
Commit Preview
==============

AI-Generated Message:
{ai_message}

Changes ({changes['file_count']} files):
{file_list}

Stats:
{changes['stats']}

Would you like to:
1. Commit with this message
2. Edit the message
3. Cancel
"""
        return preview
    
    def edit_commit_message(self, original_message: str) -> Optional[str]:
        """Allow user to edit commit message."""
        import tempfile
        import os
        
        # Create temporary file with message
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(original_message)
            temp_path = f.name
        
        try:
            # Open in default editor
            editor = os.getenv('EDITOR', 'notepad' if os.name == 'nt' else 'nano')
            subprocess.run([editor, temp_path], check=True)
            
            # Read edited message
            with open(temp_path, 'r') as f:
                edited_message = f.read().strip()
            
            return edited_message if edited_message else None
        except Exception:
            return None
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except Exception:
                pass
    
    def show_diff_summary(self) -> str:
        """Show a summary of the diff."""
        changes = self.get_staged_changes()
        
        summary = f"Repository: {self.repo_path.name}\n"
        summary += f"Files changed: {changes['file_count']}\n"
        summary += f"{changes['stats']}\n\n"
        
        summary += "Files:\n"
        for file_info in changes["files"]:
            summary += f"  [{file_info['status']}] {file_info['filename']}\n"
        
        return summary
