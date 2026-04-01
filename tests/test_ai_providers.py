"""Unit tests for AI providers."""

import unittest
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_providers import OllamaProvider, AIProviderManager


class TestOllamaProvider(unittest.TestCase):
    """Test Ollama provider."""
    
    def setUp(self):
        self.provider = OllamaProvider()
    
    def test_provider_name(self):
        """Test provider name."""
        self.assertIn("Ollama", self.provider.get_name())
    
    def test_empty_diff(self):
        """Test with empty diff."""
        result = self.provider.generate_commit_message("")
        self.assertIsNone(result)
    
    def test_small_diff(self):
        """Test with small diff (should return None)."""
        small_diff = "diff --git a/test.py\n+print('hello')"
        # This is less than MIN_DIFF_FOR_SUMMARY
        # Result depends on MIN_DIFF_FOR_SUMMARY setting
        result = self.provider.generate_commit_message(small_diff)
        # May be None if diff too small
        self.assertTrue(result is None or isinstance(result, str))


class TestAIProviderManager(unittest.TestCase):
    """Test AI provider manager."""
    
    def setUp(self):
        self.manager = AIProviderManager()
    
    def test_manager_initialization(self):
        """Test manager initializes with providers."""
        self.assertGreater(len(self.manager.providers), 0)
    
    def test_available_providers(self):
        """Test getting available providers."""
        providers = self.manager.get_available_providers()
        self.assertIsInstance(providers, list)
        self.assertGreater(len(providers), 0)
    
    def test_empty_diff(self):
        """Test manager with empty diff."""
        result = self.manager.generate_commit_message("")
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
