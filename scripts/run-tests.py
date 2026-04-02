#!/usr/bin/env python3
"""Unified test runner for GitPulse."""

import subprocess
import sys
from pathlib import Path


def run_python_tests():
    """Run Python backend tests."""
    print("Running Python backend tests...")
    root = Path(__file__).parent.parent
    backend_dir = root / "backend"
    
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/", "-v"],
        cwd=backend_dir,
        capture_output=False
    )
    return result.returncode == 0


def run_electron_tests():
    """Run Electron app tests."""
    print("\nRunning Electron tests...")
    root = Path(__file__).parent.parent
    electron_dir = root / "electron-app"
    
    result = subprocess.run(
        ["npm", "test"],
        cwd=electron_dir,
        capture_output=False
    )
    return result.returncode == 0


def main():
    """Run all tests."""
    print("=" * 50)
    print("GitPulse Test Runner")
    print("=" * 50)
    
    python_ok = run_python_tests()
    electron_ok = run_electron_tests()
    
    print("\n" + "=" * 50)
    if python_ok and electron_ok:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
