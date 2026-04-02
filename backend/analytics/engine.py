"""Analytics and metrics tracking for GitPulse."""

from __future__ import annotations

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional


class AnalyticsTracker:
    """Track usage analytics and metrics."""
    
    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or Path(__file__).parent / ".gitpulse-analytics.json"
        self.data = self._load_data()
    
    def _load_data(self) -> dict:
        """Load analytics data from file."""
        if not self.data_path.exists():
            return self._get_default_data()
        
        try:
            data = json.loads(self.data_path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                return self._get_default_data()
            return data
        except (json.JSONDecodeError, OSError):
            return self._get_default_data()
    
    def _get_default_data(self) -> dict:
        """Get default analytics data structure."""
        return {
            "total_commits": 0,
            "ai_commits": 0,
            "manual_commits": 0,
            "total_pushes": 0,
            "failed_pushes": 0,
            "repos_tracked": 0,
            "first_use": datetime.utcnow().isoformat(),
            "last_use": datetime.utcnow().isoformat(),
            "daily_stats": {},
            "repo_stats": {},
            "error_stats": {},
            "ai_provider_stats": {}
        }
    
    def _save(self):
        """Save analytics data to file."""
        try:
            self.data_path.write_text(
                json.dumps(self.data, indent=2),
                encoding="utf-8"
            )
        except OSError:
            pass
    
    def track_commit(self, repo_name: str, ai_generated: bool = False):
        """Track a commit event."""
        self.data["total_commits"] += 1
        if ai_generated:
            self.data["ai_commits"] += 1
        else:
            self.data["manual_commits"] += 1
        
        # Update daily stats
        today = datetime.utcnow().date().isoformat()
        if today not in self.data["daily_stats"]:
            self.data["daily_stats"][today] = {
                "commits": 0,
                "ai_commits": 0,
                "pushes": 0
            }
        self.data["daily_stats"][today]["commits"] += 1
        if ai_generated:
            self.data["daily_stats"][today]["ai_commits"] += 1
        
        # Update repo stats
        if repo_name not in self.data["repo_stats"]:
            self.data["repo_stats"][repo_name] = {
                "commits": 0,
                "ai_commits": 0,
                "pushes": 0,
                "errors": 0
            }
        self.data["repo_stats"][repo_name]["commits"] += 1
        if ai_generated:
            self.data["repo_stats"][repo_name]["ai_commits"] += 1
        
        self.data["last_use"] = datetime.utcnow().isoformat()
        self._save()
    
    def track_push(self, repo_name: str, success: bool = True):
        """Track a push event."""
        self.data["total_pushes"] += 1
        if not success:
            self.data["failed_pushes"] += 1
        
        # Update daily stats
        today = datetime.utcnow().date().isoformat()
        if today not in self.data["daily_stats"]:
            self.data["daily_stats"][today] = {
                "commits": 0,
                "ai_commits": 0,
                "pushes": 0
            }
        self.data["daily_stats"][today]["pushes"] += 1
        
        # Update repo stats
        if repo_name in self.data["repo_stats"]:
            self.data["repo_stats"][repo_name]["pushes"] += 1
        
        self.data["last_use"] = datetime.utcnow().isoformat()
        self._save()
    
    def track_error(self, repo_name: str, error_type: str):
        """Track an error event."""
        if error_type not in self.data["error_stats"]:
            self.data["error_stats"][error_type] = 0
        self.data["error_stats"][error_type] += 1
        
        if repo_name in self.data["repo_stats"]:
            self.data["repo_stats"][repo_name]["errors"] += 1
        
        self._save()
    
    def track_ai_provider_usage(self, provider_name: str, success: bool = True):
        """Track AI provider usage."""
        if provider_name not in self.data["ai_provider_stats"]:
            self.data["ai_provider_stats"][provider_name] = {
                "requests": 0,
                "successes": 0,
                "failures": 0
            }
        
        self.data["ai_provider_stats"][provider_name]["requests"] += 1
        if success:
            self.data["ai_provider_stats"][provider_name]["successes"] += 1
        else:
            self.data["ai_provider_stats"][provider_name]["failures"] += 1
        
        self._save()
    
    def update_repos_tracked(self, count: int):
        """Update the number of repos being tracked."""
        self.data["repos_tracked"] = count
        self._save()
    
    def get_summary(self) -> dict:
        """Get analytics summary."""
        total_commits = self.data["total_commits"]
        ai_commits = self.data["ai_commits"]
        
        return {
            "total_commits": total_commits,
            "ai_commits": ai_commits,
            "ai_percentage": round(ai_commits / total_commits * 100, 1) if total_commits > 0 else 0,
            "total_pushes": self.data["total_pushes"],
            "failed_pushes": self.data["failed_pushes"],
            "success_rate": round((self.data["total_pushes"] - self.data["failed_pushes"]) / self.data["total_pushes"] * 100, 1) if self.data["total_pushes"] > 0 else 0,
            "repos_tracked": self.data["repos_tracked"],
            "days_active": self._get_days_active(),
            "avg_commits_per_day": self._get_avg_commits_per_day()
        }
    
    def get_daily_stats(self, days: int = 30) -> dict:
        """Get daily statistics for the last N days."""
        stats = {}
        today = datetime.utcnow().date()
        
        for i in range(days):
            date = (today - timedelta(days=i)).isoformat()
            stats[date] = self.data["daily_stats"].get(date, {
                "commits": 0,
                "ai_commits": 0,
                "pushes": 0
            })
        
        return stats
    
    def get_repo_stats(self) -> dict:
        """Get per-repository statistics."""
        return self.data["repo_stats"]
    
    def get_error_stats(self) -> dict:
        """Get error statistics."""
        return self.data["error_stats"]
    
    def get_ai_provider_stats(self) -> dict:
        """Get AI provider statistics."""
        return self.data["ai_provider_stats"]
    
    def _get_days_active(self) -> int:
        """Calculate number of days active."""
        try:
            first_use = datetime.fromisoformat(self.data["first_use"])
            last_use = datetime.fromisoformat(self.data["last_use"])
            return (last_use - first_use).days + 1
        except (ValueError, KeyError):
            return 1
    
    def _get_avg_commits_per_day(self) -> float:
        """Calculate average commits per day."""
        days = self._get_days_active()
        if days == 0:
            return 0.0
        return round(self.data["total_commits"] / days, 1)
    
    def reset(self):
        """Reset all analytics data."""
        self.data = self._get_default_data()
        self._save()
