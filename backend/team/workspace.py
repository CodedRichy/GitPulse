"""Team workspace and collaboration features for GitPulse."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional


class TeamWorkspace:
    """Manage team workspaces and shared settings."""
    
    def __init__(self, workspace_id: str, workspace_file: Optional[Path] = None):
        self.workspace_id = workspace_id
        self.workspace_file = workspace_file or Path(__file__).parent / f".gitpulse-workspace-{workspace_id}.json"
        self.data = self._load_workspace()
    
    def _load_workspace(self) -> dict:
        """Load workspace data."""
        if not self.workspace_file.exists():
            return self._get_default_workspace()
        
        try:
            data = json.loads(self.workspace_file.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                return self._get_default_workspace()
            return data
        except (json.JSONDecodeError, OSError):
            return self._get_default_workspace()
    
    def _get_default_workspace(self) -> dict:
        """Get default workspace structure."""
        return {
            "workspace_id": self.workspace_id,
            "name": "My Workspace",
            "created_at": datetime.utcnow().isoformat(),
            "owner": None,
            "members": [],
            "repositories": [],
            "shared_templates": {},
            "team_settings": {
                "require_approval": False,
                "auto_push": True,
                "ai_provider": "ollama",
                "commit_prefix": ""
            },
            "activity_log": []
        }
    
    def _save(self):
        """Save workspace data."""
        try:
            self.workspace_file.write_text(
                json.dumps(self.data, indent=2),
                encoding="utf-8"
            )
        except OSError:
            pass
    
    def add_member(self, user_id: str, email: str, role: str = "member") -> bool:
        """Add a member to the workspace."""
        member = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "joined_at": datetime.utcnow().isoformat()
        }
        
        # Check if already a member
        for m in self.data["members"]:
            if m["user_id"] == user_id:
                return False
        
        self.data["members"].append(member)
        self._log_activity("member_added", f"{email} joined the workspace")
        self._save()
        return True
    
    def remove_member(self, user_id: str) -> bool:
        """Remove a member from the workspace."""
        original_count = len(self.data["members"])
        self.data["members"] = [m for m in self.data["members"] if m["user_id"] != user_id]
        
        if len(self.data["members"]) < original_count:
            self._log_activity("member_removed", f"Member {user_id} left the workspace")
            self._save()
            return True
        return False
    
    def add_repository(self, repo_path: str, repo_name: str) -> bool:
        """Add a repository to the workspace."""
        repo = {
            "path": repo_path,
            "name": repo_name,
            "added_at": datetime.utcnow().isoformat()
        }
        
        # Check if already added
        for r in self.data["repositories"]:
            if r["path"] == repo_path:
                return False
        
        self.data["repositories"].append(repo)
        self._log_activity("repo_added", f"Repository {repo_name} added")
        self._save()
        return True
    
    def add_template(self, template_name: str, template_content: str, author: str) -> bool:
        """Add a shared commit message template."""
        self.data["shared_templates"][template_name] = {
            "content": template_content,
            "author": author,
            "created_at": datetime.utcnow().isoformat()
        }
        self._log_activity("template_added", f"Template '{template_name}' added by {author}")
        self._save()
        return True
    
    def get_template(self, template_name: str) -> Optional[str]:
        """Get a template by name."""
        template = self.data["shared_templates"].get(template_name)
        return template["content"] if template else None
    
    def update_settings(self, settings: dict) -> bool:
        """Update team settings."""
        self.data["team_settings"].update(settings)
        self._log_activity("settings_updated", "Team settings updated")
        self._save()
        return True
    
    def get_settings(self) -> dict:
        """Get team settings."""
        return self.data["team_settings"]
    
    def _log_activity(self, activity_type: str, description: str):
        """Log workspace activity."""
        activity = {
            "type": activity_type,
            "description": description,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.data["activity_log"].append(activity)
        
        # Keep only last 100 activities
        if len(self.data["activity_log"]) > 100:
            self.data["activity_log"] = self.data["activity_log"][-100:]
    
    def get_activity_log(self, limit: int = 50) -> list:
        """Get recent activity log."""
        return self.data["activity_log"][-limit:]
    
    def get_members(self) -> list:
        """Get all workspace members."""
        return self.data["members"]
    
    def get_repositories(self) -> list:
        """Get all workspace repositories."""
        return self.data["repositories"]


class TeamAnalytics:
    """Team-level analytics and insights."""
    
    def __init__(self, workspace: TeamWorkspace):
        self.workspace = workspace
    
    def get_team_summary(self) -> dict:
        """Get team productivity summary."""
        return {
            "total_members": len(self.workspace.get_members()),
            "total_repositories": len(self.workspace.get_repositories()),
            "shared_templates": len(self.workspace.data["shared_templates"]),
            "recent_activity": len(self.workspace.get_activity_log(7))
        }
    
    def get_member_contributions(self) -> dict:
        """Get per-member contribution stats."""
        # This would integrate with analytics.py to track per-user stats
        # Placeholder for now
        return {
            "members": self.workspace.get_members(),
            "note": "Per-member analytics coming soon"
        }
