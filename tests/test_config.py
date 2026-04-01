"""Unit tests for configuration system."""

import unittest
from pathlib import Path
import sys
import tempfile
import os

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import GitPulseConfig


class TestGitPulseConfig(unittest.TestCase):
    """Test configuration manager."""
    
    def setUp(self):
        # Use temporary file for testing
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        self.temp_file.close()
        self.config = GitPulseConfig(Path(self.temp_file.name))
    
    def tearDown(self):
        # Clean up temp file
        try:
            os.unlink(self.temp_file.name)
        except Exception:
            pass
    
    def test_default_config(self):
        """Test default configuration values."""
        self.assertEqual(self.config.get('ai_provider'), 'ollama')
        self.assertEqual(self.config.get('debounce_seconds'), 60)
        self.assertTrue(self.config.get('enable_analytics'))
    
    def test_set_and_get(self):
        """Test setting and getting values."""
        self.config.set('ai_provider', 'openai')
        self.assertEqual(self.config.get('ai_provider'), 'openai')
    
    def test_tier_detection(self):
        """Test user tier detection."""
        self.assertFalse(self.config.is_pro_user())
        self.config.set('user_tier', 'pro')
        self.assertTrue(self.config.is_pro_user())
    
    def test_feature_limits(self):
        """Test feature limits based on tier."""
        limits = self.config.get_feature_limits()
        self.assertEqual(limits['max_repos'], 1)  # Free tier
        
        self.config.set('user_tier', 'pro')
        limits = self.config.get_feature_limits()
        self.assertEqual(limits['max_repos'], -1)  # Unlimited


if __name__ == "__main__":
    unittest.main()
