"""API server for GitPulse remote access and integrations."""

from __future__ import annotations

import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

from backend.analytics.engine import AnalyticsTracker
from backend.core.config import GitPulseConfig


class GitPulseAPIHandler(BaseHTTPRequestHandler):
    """HTTP request handler for GitPulse API."""
    
    def __init__(self, *args, analytics: Optional[AnalyticsTracker] = None, config: Optional[GitPulseConfig] = None, **kwargs):
        self.analytics = analytics or AnalyticsTracker()
        self.config = config or GitPulseConfig()
        super().__init__(*args, **kwargs)
    
    def _set_headers(self, status=200, content_type="application/json"):
        """Set response headers."""
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
    
    def _send_json(self, data: dict, status=200):
        """Send JSON response."""
        self._set_headers(status)
        self.wfile.write(json.dumps(data).encode())
    
    def _send_error(self, message: str, status=400):
        """Send error response."""
        self._send_json({"error": message}, status)
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests (CORS preflight)."""
        self._set_headers()
    
    def do_GET(self):
        """Handle GET requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == "/api/health":
            self._send_json({"status": "healthy", "timestamp": datetime.utcnow().isoformat()})
        
        elif path == "/api/analytics/summary":
            summary = self.analytics.get_summary()
            self._send_json(summary)
        
        elif path == "/api/analytics/daily":
            params = parse_qs(parsed.query)
            days = int(params.get("days", ["30"])[0])
            daily_stats = self.analytics.get_daily_stats(days)
            self._send_json(daily_stats)
        
        elif path == "/api/analytics/repos":
            repo_stats = self.analytics.get_repo_stats()
            self._send_json(repo_stats)
        
        elif path == "/api/analytics/errors":
            error_stats = self.analytics.get_error_stats()
            self._send_json(error_stats)
        
        elif path == "/api/analytics/providers":
            provider_stats = self.analytics.get_ai_provider_stats()
            self._send_json(provider_stats)
        
        elif path == "/api/config":
            config_data = {
                "ai_provider": self.config.get("ai_provider"),
                "debounce_seconds": self.config.get("debounce_seconds"),
                "enable_analytics": self.config.get("enable_analytics"),
                "user_tier": self.config.get("user_tier")
            }
            self._send_json(config_data)
        
        else:
            self._send_error("Endpoint not found", 404)
    
    def do_POST(self):
        """Handle POST requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else "{}"
        
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._send_error("Invalid JSON")
            return
        
        if path == "/api/config":
            # Update configuration
            for key, value in data.items():
                if key in ["ai_provider", "debounce_seconds", "enable_analytics", "theme"]:
                    self.config.set(key, value)
            self._send_json({"success": True, "message": "Configuration updated"})
        
        elif path == "/api/analytics/reset":
            self.analytics.reset()
            self._send_json({"success": True, "message": "Analytics reset"})
        
        else:
            self._send_error("Endpoint not found", 404)
    
    def log_message(self, format, *args):
        """Override to suppress default logging."""
        pass


class GitPulseAPIServer:
    """API server for GitPulse."""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 5000):
        self.host = host
        self.port = port
        self.analytics = AnalyticsTracker()
        self.config = GitPulseConfig()
        self.server = None
    
    def start(self):
        """Start the API server."""
        def handler(*args, **kwargs):
            return GitPulseAPIHandler(*args, analytics=self.analytics, config=self.config, **kwargs)
        
        self.server = HTTPServer((self.host, self.port), handler)
        print(f"GitPulse API server running on http://{self.host}:{self.port}")
        print(f"Dashboard: http://{self.host}:{self.port}/dashboard")
        print(f"API docs: http://{self.host}:{self.port}/api/docs")
        
        try:
            self.server.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            self.server.shutdown()
    
    def stop(self):
        """Stop the API server."""
        if self.server:
            self.server.shutdown()


if __name__ == "__main__":
    server = GitPulseAPIServer()
    server.start()
