"""Integration framework for GitPulse with external services."""

from __future__ import annotations

import json
import os
import urllib.request
from abc import ABC, abstractmethod
from typing import Optional


class Integration(ABC):
    """Base class for external integrations."""
    
    @abstractmethod
    def send_notification(self, title: str, message: str, repo_name: str) -> bool:
        """Send a notification to the external service."""
        pass
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the integration is properly configured."""
        pass


class SlackIntegration(Integration):
    """Slack webhook integration."""
    
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.getenv("SLACK_WEBHOOK_URL")
    
    def send_notification(self, title: str, message: str, repo_name: str) -> bool:
        """Send notification to Slack."""
        if not self.webhook_url:
            return False
        
        payload = {
            "text": f"*{title}*",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"⚡ {title}"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Repository:*\n{repo_name}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Message:*\n{message}"
                        }
                    ]
                }
            ]
        }
        
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.webhook_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except Exception:
            return False
    
    def is_configured(self) -> bool:
        """Check if Slack webhook is configured."""
        return bool(self.webhook_url)


class DiscordIntegration(Integration):
    """Discord webhook integration."""
    
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.getenv("DISCORD_WEBHOOK_URL")
    
    def send_notification(self, title: str, message: str, repo_name: str) -> bool:
        """Send notification to Discord."""
        if not self.webhook_url:
            return False
        
        payload = {
            "embeds": [
                {
                    "title": f"⚡ {title}",
                    "description": message,
                    "color": 6366961,  # Primary color
                    "fields": [
                        {
                            "name": "Repository",
                            "value": repo_name,
                            "inline": True
                        }
                    ],
                    "footer": {
                        "text": "GitPulse"
                    }
                }
            ]
        }
        
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.webhook_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except Exception:
            return False
    
    def is_configured(self) -> bool:
        """Check if Discord webhook is configured."""
        return bool(self.webhook_url)


class JiraIntegration(Integration):
    """Jira API integration for issue linking."""
    
    def __init__(self, api_url: Optional[str] = None, api_token: Optional[str] = None, email: Optional[str] = None):
        self.api_url = api_url or os.getenv("JIRA_API_URL")
        self.api_token = api_token or os.getenv("JIRA_API_TOKEN")
        self.email = email or os.getenv("JIRA_EMAIL")
    
    def send_notification(self, title: str, message: str, repo_name: str) -> bool:
        """Add comment to Jira issue (if issue key found in message)."""
        if not self.is_configured():
            return False
        
        # Extract Jira issue key (e.g., PROJ-123)
        import re
        issue_keys = re.findall(r'\b[A-Z]+-\d+\b', message)
        
        if not issue_keys:
            return False
        
        issue_key = issue_keys[0]
        comment = f"GitPulse auto-commit in {repo_name}:\n{message}"
        
        payload = {
            "body": comment
        }
        
        body = json.dumps(payload).encode("utf-8")
        
        # Basic auth with email and API token
        import base64
        credentials = base64.b64encode(f"{self.email}:{self.api_token}".encode()).decode()
        
        req = urllib.request.Request(
            f"{self.api_url}/rest/api/3/issue/{issue_key}/comment",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {credentials}"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 201
        except Exception:
            return False
    
    def is_configured(self) -> bool:
        """Check if Jira is configured."""
        return bool(self.api_url and self.api_token and self.email)


class IntegrationManager:
    """Manage all external integrations."""
    
    def __init__(self):
        self.integrations: list[Integration] = []
        self._load_integrations()
    
    def _load_integrations(self):
        """Load configured integrations."""
        slack = SlackIntegration()
        if slack.is_configured():
            self.integrations.append(slack)
        
        discord = DiscordIntegration()
        if discord.is_configured():
            self.integrations.append(discord)
        
        jira = JiraIntegration()
        if jira.is_configured():
            self.integrations.append(jira)
    
    def notify_all(self, title: str, message: str, repo_name: str):
        """Send notification to all configured integrations."""
        for integration in self.integrations:
            try:
                integration.send_notification(title, message, repo_name)
            except Exception:
                pass
    
    def get_configured_integrations(self) -> list[str]:
        """Get list of configured integration names."""
        names = []
        for integration in self.integrations:
            names.append(integration.__class__.__name__.replace("Integration", ""))
        return names
