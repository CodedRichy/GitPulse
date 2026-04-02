"""AI Provider abstraction layer for multiple AI models."""

from __future__ import annotations

import json
import os
import urllib.request
from abc import ABC, abstractmethod
from typing import Optional


class AIProvider(ABC):
    """Base class for AI providers."""
    
    @abstractmethod
    def generate_commit_message(self, diff: str) -> Optional[str]:
        """Generate a commit message from a git diff."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is available and configured."""
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Get the provider name."""
        pass


class OllamaProvider(AIProvider):
    """Local Ollama AI provider."""
    
    def __init__(self, model: str = "qwen3.5:9b", api_url: str = "http://127.0.0.1:11434/api/generate"):
        self.model = model
        self.api_url = api_url
        self.timeout = 8
    
    def generate_commit_message(self, diff: str) -> Optional[str]:
        if not diff.strip():
            return None
        
        prompt = "Summarize this git diff in one sentence for a commit message. No quotes, no prefix, just the sentence.\n\n" + diff
        
        body = json.dumps({
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_k": 10,
                "top_p": 0.8,
                "num_predict": 60,
                "num_ctx": 2048,
                "keepalive": "5m"
            }
        }).encode("utf-8")
        
        req = urllib.request.Request(
            self.api_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
            content = data.get("response", "")
            if content and isinstance(content, str):
                return content.strip()[:200]
            return None
        except Exception:
            return None
    
    def is_available(self) -> bool:
        try:
            req = urllib.request.Request(
                self.api_url.replace("/api/generate", "/api/tags"),
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=2) as resp:
                return resp.status == 200
        except Exception:
            return False
    
    def get_name(self) -> str:
        return f"Ollama ({self.model})"


class OpenAIProvider(AIProvider):
    """OpenAI GPT provider."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.api_url = "https://api.openai.com/v1/chat/completions"
        self.timeout = 10
    
    def generate_commit_message(self, diff: str) -> Optional[str]:
        if not self.api_key or not diff.strip():
            return None
        
        body = json.dumps({
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that writes concise git commit messages."},
                {"role": "user", "content": f"Summarize this git diff in one sentence for a commit message. No quotes, no prefix, just the sentence:\n\n{diff}"}
            ],
            "max_tokens": 60,
            "temperature": 0.2
        }).encode("utf-8")
        
        req = urllib.request.Request(
            self.api_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if content and isinstance(content, str):
                return content.strip()[:200]
            return None
        except Exception:
            return None
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_name(self) -> str:
        return f"OpenAI ({self.model})"


class AnthropicProvider(AIProvider):
    """Anthropic Claude provider."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-haiku-20240307"):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = model
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.timeout = 10
    
    def generate_commit_message(self, diff: str) -> Optional[str]:
        if not self.api_key or not diff.strip():
            return None
        
        body = json.dumps({
            "model": self.model,
            "max_tokens": 60,
            "messages": [
                {"role": "user", "content": f"Summarize this git diff in one sentence for a commit message. No quotes, no prefix, just the sentence:\n\n{diff}"}
            ]
        }).encode("utf-8")
        
        req = urllib.request.Request(
            self.api_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
            content = data.get("content", [{}])[0].get("text", "")
            if content and isinstance(content, str):
                return content.strip()[:200]
            return None
        except Exception:
            return None
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_name(self) -> str:
        return f"Anthropic ({self.model})"


class AIProviderManager:
    """Manages multiple AI providers with fallback support."""
    
    def __init__(self):
        self.providers: list[AIProvider] = []
        self._load_providers()
    
    def _load_providers(self):
        """Load and configure available providers."""
        # Always add Ollama as default
        ollama = OllamaProvider()
        self.providers.append(ollama)
        
        # Add OpenAI if API key is available
        if os.getenv("OPENAI_API_KEY"):
            openai = OpenAIProvider()
            self.providers.append(openai)
        
        # Add Anthropic if API key is available
        if os.getenv("ANTHROPIC_API_KEY"):
            anthropic = AnthropicProvider()
            self.providers.append(anthropic)
    
    def generate_commit_message(self, diff: str) -> Optional[str]:
        """Try each provider in order until one succeeds."""
        for provider in self.providers:
            if provider.is_available():
                result = provider.generate_commit_message(diff)
                if result:
                    return result
        return None
    
    def get_available_providers(self) -> list[str]:
        """Get list of available provider names."""
        return [p.get_name() for p in self.providers if p.is_available()]
    
    def set_preferred_provider(self, provider_name: str):
        """Set preferred provider by moving it to the front of the list."""
        for i, provider in enumerate(self.providers):
            if provider.get_name().lower().startswith(provider_name.lower()):
                self.providers.insert(0, self.providers.pop(i))
                break
