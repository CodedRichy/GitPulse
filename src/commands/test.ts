import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CommandRegistration, CommandResult, CommandContext } from './types.js';
import { GitOperations } from '../core/git.js';

interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: CoverageReport;
}

interface CoverageReport {
  lines: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
}

type TestRunner = 'jest' | 'vitest' | 'mocha' | 'pytest' | 'cargo' | 'go';

function detectTestRunner(repoRoot: string): TestRunner | null {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
  }

  if (fs.existsSync(path.join(repoRoot, 'Cargo.toml'))) return 'cargo';
  if (fs.existsSync(path.join(repoRoot, 'go.mod'))) return 'go';
  if (fs.existsSync(path.join(repoRoot, 'requirements.txt')) ||
      fs.existsSync(path.join(repoRoot, 'pyproject.toml'))) return 'pytest';

  return null;
}

function getTestCommand(runner: TestRunner, coverage: boolean): { cmd: string; args: string[] } {
  switch (runner) {
    case 'jest':
      return { cmd: 'npx', args: ['jest', ...(coverage ? ['--coverage'] : []), '--json'] };
    case 'vitest':
      return { cmd: 'npx', args: ['vitest', 'run', ...(coverage ? ['--coverage'] : []), '--reporter=json'] };
    case 'mocha':
      return { cmd: 'npx', args: ['mocha', ...(coverage ? ['--coverage'] : []), '--reporter=json'] };
    case 'pytest':
      return { cmd: 'python', args: ['-m', 'pytest', ...(coverage ? ['--cov'] : []), '-v'] };
    case 'cargo':
      return { cmd: 'cargo', args: ['test', ...(coverage ? ['--coverage'] : [])] };
    case 'go':
      return { cmd: 'go', args: ['test', ...(coverage ? ['-cover'] : []), '-v', './...'] };
  }
}

async function runTests(
  runner: TestRunner,
  coverage: boolean,
  repoRoot: string
): Promise<TestResult> {
  const { cmd, args } = getTestCommand(runner, coverage);

  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    const child = spawn(cmd, args, {
      cwd: repoRoot,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;

      if (runner === 'jest' || runner === 'vitest') {
        try {
          const output = JSON.parse(stdout);
          resolve({
            passed: output.numPassedTests || 0,
            failed: output.numFailedTests || 0,
            skipped: output.numPendingTests || 0,
            duration,
            coverage: output.coverageMap ? parseCoverage(output.coverageMap) : undefined,
          });
          return;
        } catch {
          // Fallback to parsing
        }
      }

      if (runner === 'pytest') {
        const passedMatch = stdout.match(/(\d+) passed/);
        const failedMatch = stdout.match(/(\d+) failed/);
        const skippedMatch = stdout.match(/(\d+) skipped/);

        resolve({
          passed: passedMatch ? parseInt(passedMatch[1]) : 0,
          failed: failedMatch ? parseInt(failedMatch[1]) : 0,
          skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
          duration,
        });
        return;
      }

      if (runner === 'go') {
        const okMatch = stdout.match(/ok\s+\S+/g);
        const failMatch = stdout.match(/FAIL\s+\S+/g);

        resolve({
          passed: okMatch ? okMatch.length : 0,
          failed: failMatch ? failMatch.length : 0,
          skipped: 0,
          duration,
        });
        return;
      }

      if (runner === 'cargo') {
        const passedMatch = stdout.match(/test result:.*?(\d+) passed/);
        const failedMatch = stdout.match(/test result:.*?(\d+) failed/);

        resolve({
          passed: passedMatch ? parseInt(passedMatch[1]) : 0,
          failed: failedMatch ? parseInt(failedMatch[1]) : 0,
          skipped: 0,
          duration,
        });
        return;
      }

      resolve({
        passed: code === 0 ? 1 : 0,
        failed: code !== 0 ? 1 : 0,
        skipped: 0,
        duration,
      });
    });

    child.on('error', () => {
      resolve({
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
      });
    });
  });
}

function parseCoverage(coverageMap: unknown): CoverageReport {
  // Simplified coverage parsing
  return {
    lines: { total: 0, covered: 0, pct: 0 },
    functions: { total: 0, covered: 0, pct: 0 },
    branches: { total: 0, covered: 0, pct: 0 },
    statements: { total: 0, covered: 0, pct: 0 },
  };
}

async function testHandler(context: CommandContext): Promise<CommandResult> {
  const gitOps = new GitOperations();
  const isRepo = await gitOps.isRepo();

  if (!isRepo) {
    return {
      success: false,
      error: 'Not a git repository.',
    };
  }

  try {
    const repoRoot = await gitOps.getRepoRoot();
    const runner = detectTestRunner(repoRoot);
    const coverage = context.flags.coverage === true;

    if (!runner) {
      return {
        success: false,
        error: 'Could not detect test runner. Supported: jest, vitest, mocha, pytest, cargo, go',
      };
    }

    const result = await runTests(runner, coverage, repoRoot);

    const success = result.failed === 0;
    const coverageInfo = result.coverage
      ? `\nCoverage: Lines ${result.coverage.lines.pct}%, Functions ${result.coverage.functions.pct}%`
      : '';

    return {
      success,
      message: `Test Results (${runner}):\n` +
        `  Passed: ${result.passed}\n` +
        `  Failed: ${result.failed}\n` +
        `  Skipped: ${result.skipped}\n` +
        `  Duration: ${(result.duration / 1000).toFixed(2)}s${coverageInfo}`,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test execution failed',
    };
  }
}

export const testCommand: CommandRegistration = {
  name: 'test',
  description: 'Run tests and analyze coverage (auto-detects runner)',
  handler: testHandler,
  aliases: ['t', 'run-tests'],
};
