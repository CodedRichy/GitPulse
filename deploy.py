"""Deployment and distribution scripts for GitPulse."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import zipfile
from pathlib import Path


class GitPulseDeployer:
    """Handle GitPulse deployment and packaging."""
    
    def __init__(self, version: str = "1.0.0"):
        self.version = version
        self.root_dir = Path(__file__).parent
        self.dist_dir = self.root_dir / "dist"
        self.build_dir = self.root_dir / "build"
    
    def clean(self):
        """Clean build and dist directories."""
        for directory in [self.dist_dir, self.build_dir]:
            if directory.exists():
                shutil.rmtree(directory)
        
        self.dist_dir.mkdir(exist_ok=True)
        self.build_dir.mkdir(exist_ok=True)
    
    def create_standalone_package(self):
        """Create standalone package with all dependencies."""
        print("Creating standalone package...")
        
        package_name = f"gitpulse-{self.version}-{platform.system().lower()}"
        package_dir = self.build_dir / package_name
        package_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy main files
        files_to_copy = [
            "git-pulse.py",
            "ai_providers.py",
            "analytics.py",
            "config.py",
            "payment.py",
            "integrations.py",
            "commit_preview.py",
            "team_workspace.py",
            "api_server.py",
            "requirements.txt",
            "README.md",
            "LICENSE",
            "FEATURES.md",
            "QUICKSTART.md"
        ]
        
        for file in files_to_copy:
            src = self.root_dir / file
            if src.exists():
                shutil.copy2(src, package_dir / file)
        
        # Copy web directory
        web_src = self.root_dir / "web"
        if web_src.exists():
            shutil.copytree(web_src, package_dir / "web", dirs_exist_ok=True)
        
        # Create install script
        self._create_install_script(package_dir)
        
        # Create zip archive
        zip_path = self.dist_dir / f"{package_name}.zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(package_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(self.build_dir)
                    zipf.write(file_path, arcname)
        
        print(f"✓ Created package: {zip_path}")
        return zip_path
    
    def _create_install_script(self, package_dir: Path):
        """Create installation script."""
        if platform.system() == "Windows":
            install_script = package_dir / "install.bat"
            install_script.write_text("""@echo off
echo Installing GitPulse...
python -m pip install -r requirements.txt
echo.
echo Installation complete!
echo.
echo To start GitPulse:
echo   python git-pulse.py
echo.
pause
""")
        else:
            install_script = package_dir / "install.sh"
            install_script.write_text("""#!/bin/bash
echo "Installing GitPulse..."
python3 -m pip install -r requirements.txt
echo ""
echo "Installation complete!"
echo ""
echo "To start GitPulse:"
echo "  python3 git-pulse.py"
echo ""
""")
            install_script.chmod(0o755)
    
    def create_pypi_package(self):
        """Create PyPI package."""
        print("Creating PyPI package...")
        
        # Create setup.py
        setup_content = f'''from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="gitpulse",
    version="{self.version}",
    author="Rishi Praseeth Krishnan",
    description="Privacy-first automated Git commits with AI",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/CodedRichy/GitPulse",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Version Control :: Git",
        "License :: Other/Proprietary License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.10",
    install_requires=[
        "watchdog>=4.0.0,<7",
        "rich>=13.0.0,<15",
    ],
    entry_points={{
        "console_scripts": [
            "gitpulse=git-pulse:main",
        ],
    }},
)
'''
        setup_file = self.root_dir / "setup.py"
        setup_file.write_text(setup_content)
        
        # Build package
        try:
            subprocess.run(["python", "-m", "build"], cwd=self.root_dir, check=True)
            print("✓ PyPI package created in dist/")
        except subprocess.CalledProcessError:
            print("✗ Failed to build PyPI package. Install 'build' package: pip install build")
    
    def create_docker_image(self):
        """Create Docker image."""
        print("Creating Docker image...")
        
        dockerfile_content = f'''FROM python:3.11-slim

WORKDIR /app

# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose API port
EXPOSE 5000

# Run GitPulse
CMD ["python", "git-pulse.py", "--cli"]
'''
        
        dockerfile = self.root_dir / "Dockerfile"
        dockerfile.write_text(dockerfile_content)
        
        # Create .dockerignore
        dockerignore = self.root_dir / ".dockerignore"
        dockerignore.write_text("""__pycache__
*.pyc
*.pyo
*.pyd
.git
.gitignore
dist/
build/
*.egg-info/
.env
.git-pulse.log
.git-pulse.lock
.gitpulse-analytics.json
.gitpulse-license.json
""")
        
        print("✓ Dockerfile created")
        print("  Build with: docker build -t gitpulse .")
        print("  Run with: docker run -v /path/to/repos:/repos gitpulse")
    
    def deploy_all(self):
        """Create all deployment packages."""
        print(f"GitPulse Deployment v{self.version}")
        print("=" * 50)
        
        self.clean()
        self.create_standalone_package()
        self.create_docker_image()
        
        print("\n" + "=" * 50)
        print("Deployment complete!")
        print(f"Packages created in: {self.dist_dir}")


if __name__ == "__main__":
    deployer = GitPulseDeployer(version="1.0.0")
    deployer.deploy_all()
