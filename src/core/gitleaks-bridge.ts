import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

/**
 * Gitleaks Bridge: Wrapper for Gitleaks (Go) binary
 * 
 * Gitleaks is a fast, accurate secret scanning tool written in Go.
 * We use it instead of regex-based scanning for better accuracy and performance.
 * 
 * Target latency: <500ms for staged files scan
 */

export interface GitleaksFinding {
  file: string;
  line: number;
  commit: string;
  author: string;
  email: string;
  date: string;
  message: string;
  ruleID: string;
  tags: string[];
  entropy: number;
}

export interface GitleaksReport {
  findings: GitleaksFinding[];
  source: string;
  startTime: string;
  endTime: string;
}

export interface GitleaksOptions {
  repoPath?: string;
  staged?: boolean;
  verbose?: boolean;
  configPath?: string;
}

export class GitleaksBridge {
  private repoPath: string;
  private binaryName: string;

  constructor(repoPath: string = '.') {
    this.repoPath = repoPath;
    this.binaryName = os.platform() === 'win32' ? 'gitleaks.exe' : 'gitleaks';
  }

  /**
   * Check if Gitleaks binary is available in PATH
   */
  async isAvailable(): Promise<boolean> {
    return await this.detectBinary();
  }

  /**
   * Detect Gitleaks binary in PATH
   */
  private async detectBinary(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.binaryName, ['--version'], {
        stdio: 'ignore',
        shell: os.platform() === 'win32',
      });

      proc.on('error', () => resolve(false));
      proc.on('exit', (code) => resolve(code === 0));
    });
  }

  /**
   * Get Gitleaks version
   */
  async getVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const proc = spawn(this.binaryName, ['--version'], {
        stdio: ['ignore', 'pipe', 'ignore'],
        shell: os.platform() === 'win32',
      });

      let output = '';
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.on('error', () => resolve(null));
      proc.on('exit', (code) => {
        if (code === 0 && output) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Run Gitleaks detect on staged files
   * Uses --staged flag for speed and to only scan what will be committed
   */
  async detect(options: GitleaksOptions = {}): Promise<GitleaksFinding[]> {
    const {
      repoPath = this.repoPath,
      staged = true,
      verbose = false,
      configPath,
    } = options;

    const args = ['detect', '--source', repoPath, '--no-git'];

    if (staged) {
      args.push('--staged');
    }

    args.push('--report-format', 'json');
    args.push('--report-path', '-'); // Output to stdout
    args.push('--no-banner');

    if (configPath) {
      args.push('--config', configPath);
    }

    if (verbose) {
      args.push('--verbose');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(this.binaryName, args, {
        cwd: repoPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: os.platform() === 'win32',
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to run Gitleaks: ${error.message}`));
      });

      proc.on('exit', (code) => {
        if (code === 0 || code === 1) {
          // Exit code 0 = no leaks, 1 = leaks found (both are success for our purposes)
          try {
            const report: GitleaksReport = JSON.parse(stdout);
            resolve(report.findings || []);
          } catch {
            // Empty or invalid JSON means no findings
            resolve([]);
          }
        } else {
          reject(new Error(`Gitleaks failed with exit code ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Map Gitleaks findings to QualityIssue format
   */
  mapFindingsToIssues(findings: GitleaksFinding[]): Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: 'security' | 'performance' | 'maintainability' | 'style' | 'documentation';
    file: string;
    line?: number;
    column?: number;
    message: string;
    code?: string;
    fix?: string;
  }> {
    return findings.map((finding) => ({
      severity: 'critical',
      category: 'security',
      file: finding.file,
      line: finding.line,
      message: `Secret detected: ${finding.ruleID}`,
      code: finding.message,
      fix: 'Use environment variables or a secrets manager',
    }));
  }

  /**
   * Get installation instructions for current platform
   */
  getInstallationInstructions(): string {
    const platform = os.platform();
    const arch = os.arch();

    if (platform === 'win32') {
      return `
Install Gitleaks for Windows:

1. Download the latest release from: https://github.com/gitleaks/gitleaks/releases
2. Extract the ZIP file
3. Move gitleaks.exe to a directory in your PATH (e.g., C:\\Program Files\\Gitleaks)
4. Restart your terminal

Or use Windows Package Manager:
winget install Gitleaks.Gitleaks
`.trim();
    } else if (platform === 'darwin') {
      return `
Install Gitleaks for macOS:

Using Homebrew:
brew install gitleaks

Or download from: https://github.com/gitleaks/gitleaks/releases
`.trim();
    } else {
      return `
Install Gitleaks for Linux:

Using Homebrew:
brew install gitleaks

Or download from: https://github.com/gitleaks/gitleaks/releases

For Debian/Ubuntu:
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
tar xvzf gitleaks_8.18.0_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
`.trim();
    }
  }
}

export default GitleaksBridge;
