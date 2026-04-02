#!/usr/bin/env python3
"""Setup script for GitPulse development environment."""

import subprocess
import sys
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run a shell command."""
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(result.stdout)
    return True


def setup():
    """Setup development environment."""
    root = Path(__file__).parent.parent
    
    print("Setting up GitPulse development environment...")
    
    # Setup Python backend
    print("\n1. Setting up Python backend...")
    if not run_command("pip install -r requirements.txt", cwd=root):
        print("Failed to install Python dependencies")
        return False
    
    # Setup Electron app
    print("\n2. Setting up Electron app...")
    electron_dir = root / "electron-app"
    if not run_command("npm install", cwd=electron_dir):
        print("Failed to install Node dependencies")
        return False
    
    print("\nSetup complete!")
    print("\nTo start developing:")
    print("  - Backend: cd backend && python main.py")
    print("  - Electron: cd electron-app && npm run dev")
    
    return True


if __name__ == "__main__":
    if not setup():
        sys.exit(1)
