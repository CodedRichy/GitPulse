"""Unit tests for analytics system."""

import unittest
from pathlib import Path
import sys
import tempfile
import os

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.analytics.engine import AnalyticsTracker


class TestAnalyticsTracker(unittest.TestCase):
    """Test analytics tracker."""
    
    def setUp(self):
        # Use temporary file for testing
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        self.temp_file.close()
        self.tracker = AnalyticsTracker(Path(self.temp_file.name))
    
    def tearDown(self):
        # Clean up temp file
        try:
            os.unlink(self.temp_file.name)
        except Exception:
            pass
    
    def test_initialization(self):
        """Test tracker initializes correctly."""
        summary = self.tracker.get_summary()
        self.assertEqual(summary['total_commits'], 0)
        self.assertEqual(summary['ai_commits'], 0)
    
    def test_track_commit(self):
        """Test tracking commits."""
        self.tracker.track_commit('test-repo', ai_generated=True)
        summary = self.tracker.get_summary()
        self.assertEqual(summary['total_commits'], 1)
        self.assertEqual(summary['ai_commits'], 1)
        self.assertEqual(summary['ai_percentage'], 100.0)
    
    def test_track_push(self):
        """Test tracking pushes."""
        self.tracker.track_push('test-repo', success=True)
        summary = self.tracker.get_summary()
        self.assertEqual(summary['total_pushes'], 1)
        self.assertEqual(summary['failed_pushes'], 0)
        self.assertEqual(summary['success_rate'], 100.0)
    
    def test_track_error(self):
        """Test tracking errors."""
        self.tracker.track_error('test-repo', 'auth')
        error_stats = self.tracker.get_error_stats()
        self.assertEqual(error_stats['auth'], 1)
    
    def test_repo_stats(self):
        """Test per-repository statistics."""
        self.tracker.track_commit('repo1', ai_generated=True)
        self.tracker.track_commit('repo2', ai_generated=False)
        repo_stats = self.tracker.get_repo_stats()
        self.assertIn('repo1', repo_stats)
        self.assertIn('repo2', repo_stats)
        self.assertEqual(repo_stats['repo1']['commits'], 1)
        self.assertEqual(repo_stats['repo2']['commits'], 1)


if __name__ == "__main__":
    unittest.main()
