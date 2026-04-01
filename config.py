"""Configuration management for GitPulse."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional


class GitPulseConfig:
    """Configuration manager for GitPulse settings."""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or Path(__file__).parent / ".gitpulse.json"
        self.config = self._load_config()
    
    def _load_config(self) -> dict:
        """Load configuration from file."""
        if not self.config_path.exists():
            return self._get_default_config()
        
        try:
            data = json.loads(self.config_path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                return self._get_default_config()
            
            # Merge with defaults to ensure all keys exist
            default = self._get_default_config()
            default.update(data)
            return default
        except (json.JSONDecodeError, OSError):
            return self._get_default_config()
    
    def _get_default_config(self) -> dict:
        """Get default configuration."""
        return {
            "watch_root": None,
            "debounce_seconds": 60,
            "ai_provider": "ollama",
            "ollama_model": "qwen3.5:9b",
            "ollama_api_url": "http://127.0.0.1:11434/api/generate",
            "openai_model": "gpt-4o-mini",
            "anthropic_model": "claude-3-haiku-20240307",
            "min_diff_for_summary": 200,
            "max_diff_for_summary": 1500,
            "enable_analytics": True,
            "enable_notifications": True,
            "commit_preview": False,
            "auto_push": True,
            "theme": "system",
            "license_key": None,
            "user_tier": "free"
        }
    
    def save(self):
        """Save configuration to file."""
        try:
            self.config_path.write_text(
                json.dumps(self.config, indent=2),
                encoding="utf-8"
            )
        except OSError:
            pass
    
    def get(self, key: str, default=None):
        """Get configuration value."""
        return self.config.get(key, default)
    
    def set(self, key: str, value):
        """Set configuration value."""
        self.config[key] = value
        self.save()
    
    def get_ai_provider(self) -> str:
        """Get preferred AI provider."""
        return self.config.get("ai_provider", "ollama")
    
    def set_ai_provider(self, provider: str):
        """Set preferred AI provider."""
        self.set("ai_provider", provider)
    
    def is_pro_user(self) -> bool:
        """Check if user has Pro tier or higher."""
        tier = self.config.get("user_tier", "free")
        return tier in ("pro", "team", "enterprise")
    
    def is_team_user(self) -> bool:
        """Check if user has Team tier or higher."""
        tier = self.config.get("user_tier", "free")
        return tier in ("team", "enterprise")
    
    def is_enterprise_user(self) -> bool:
        """Check if user has Enterprise tier."""
        return self.config.get("user_tier") == "enterprise"
    
    def get_feature_limits(self) -> dict:
        """Get feature limits based on user tier."""
        tier = self.config.get("user_tier", "free")
        
        limits = {
            "free": {
                "max_repos": 1,
                "ai_commits_per_month": 100,
                "cloud_providers": False,
                "analytics": False,
                "team_features": False,
                "priority_support": False
            },
            "pro": {
                "max_repos": -1,  # unlimited
                "ai_commits_per_month": -1,  # unlimited
                "cloud_providers": True,
                "analytics": True,
                "team_features": False,
                "priority_support": False
            },
            "team": {
                "max_repos": -1,
                "ai_commits_per_month": -1,
                "cloud_providers": True,
                "analytics": True,
                "team_features": True,
                "priority_support": True
            },
            "enterprise": {
                "max_repos": -1,
                "ai_commits_per_month": -1,
                "cloud_providers": True,
                "analytics": True,
                "team_features": True,
                "priority_support": True,
                "sso": True,
                "audit_logs": True,
                "on_premise": True
            }
        }
        
        return limits.get(tier, limits["free"])
