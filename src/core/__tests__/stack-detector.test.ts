import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  detectProjectStack,
  suggestConfigForStack,
  formatStackSummary,
  type ProjectStack,
} from '../stack-detector.js';

describe('Stack Detector', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitpulse-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectProjectStack', () => {
    it('should detect Node.js + TypeScript project', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', dependencies: {} })
      );
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: {} })
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('typescript');
      expect(stack.runtime).toBe('node');
    });

    it('should detect React project', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { react: '^18.0.0' },
        })
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('javascript');
      expect(stack.framework).toBe('react');
    });

    it('should detect Next.js project', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { next: '^14.0.0' },
        })
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.framework).toBe('nextjs');
    });

    it('should detect Python project', () => {
      fs.writeFileSync(
        path.join(tempDir, 'pyproject.toml'),
        '[tool.poetry]\nname = "test"\n'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('python');
      expect(stack.runtime).toBe('python');
    });

    it('should detect Django project', () => {
      fs.writeFileSync(
        path.join(tempDir, 'pyproject.toml'),
        '[tool.poetry.dependencies]\ndjango = "^4.0"\n'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('python');
      expect(stack.framework).toBe('django');
    });

    it('should detect Rust project', () => {
      fs.writeFileSync(
        path.join(tempDir, 'Cargo.toml'),
        '[package]\nname = "test"\n'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('rust');
      expect(stack.testFrameworks).toContain('cargo-test');
    });

    it('should detect Go project', () => {
      fs.writeFileSync(
        path.join(tempDir, 'go.mod'),
        'module test\ngo 1.21\n'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('go');
      expect(stack.testFrameworks).toContain('go-test');
    });

    it('should detect Java project with Maven', () => {
      fs.writeFileSync(
        path.join(tempDir, 'pom.xml'),
        '<project></project>'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('java');
      expect(stack.packageManager).toBe('maven');
    });

    it('should detect Java project with Gradle', () => {
      fs.writeFileSync(
        path.join(tempDir, 'build.gradle'),
        'plugins {}'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('java');
      expect(stack.packageManager).toBe('gradle');
    });

    it('should detect ESLint', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: { eslint: '^8.0.0' },
        })
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.linters).toContain('eslint');
    });

    it('should detect Prettier', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: { prettier: '^3.0.0' },
        })
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.formatters).toContain('prettier');
    });

    it('should detect Jest', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: { jest: '^29.0.0' },
        })
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.testFrameworks).toContain('jest');
    });

    it('should detect Vitest', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: { vitest: '^1.0.0' },
        })
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.testFrameworks).toContain('vitest');
    });

    it('should detect GitHub Actions', () => {
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.ci).toContain('github-actions');
    });

    it('should detect package manager - pnpm', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      fs.writeFileSync(
        path.join(tempDir, 'pnpm-lock.yaml'),
        ''
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.packageManager).toBe('pnpm');
    });

    it('should detect package manager - yarn', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      fs.writeFileSync(
        path.join(tempDir, 'yarn.lock'),
        ''
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.packageManager).toBe('yarn');
    });

    it('should detect package manager - npm', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      fs.writeFileSync(
        path.join(tempDir, 'package-lock.json'),
        ''
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.packageManager).toBe('npm');
    });

    it('should detect pytest', () => {
      // Need a Python manifest file first
      fs.writeFileSync(
        path.join(tempDir, 'pyproject.toml'),
        '[tool.poetry]\nname = "test"\n'
      );
      fs.writeFileSync(
        path.join(tempDir, 'pytest.ini'),
        '[pytest]\n'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.testFrameworks).toContain('pytest');
    });

    it('should detect ruff linter', () => {
      fs.writeFileSync(
        path.join(tempDir, 'pyproject.toml'),
        '[tool.ruff]\nline-length = 88\n'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.linters).toContain('ruff');
    });

    it('should detect black formatter', () => {
      fs.writeFileSync(
        path.join(tempDir, 'pyproject.toml'),
        '[tool.black]\nline-length = 88\n'
      );

      const stack = detectProjectStack(tempDir);

      expect(stack.formatters).toContain('black');
    });

    it('should return unknown for empty project', () => {
      const stack = detectProjectStack(tempDir);

      expect(stack.language).toBe('unknown');
    });
  });

  describe('suggestConfigForStack', () => {
    it('should suggest React-specific gates', () => {
      const stack: ProjectStack = {
        language: 'typescript',
        framework: 'react',
        linters: ['eslint'],
        formatters: ['prettier'],
        testFrameworks: ['vitest'],
        ci: [],
      };

      const config = suggestConfigForStack(stack);

      expect(config.enabledGates).toContain('security-scan');
      expect(config.customGates.some(g => g.name === 'no-console-in-components')).toBe(true);
    });

    it('should suggest Python-specific gates', () => {
      const stack: ProjectStack = {
        language: 'python',
        framework: 'django',
        linters: ['ruff'],
        formatters: ['black'],
        testFrameworks: ['pytest'],
        ci: [],
      };

      const config = suggestConfigForStack(stack);

      expect(config.customGates.some(g => g.name === 'no-print-statements')).toBe(true);
      expect(config.customGates.some(g => g.name === 'no-debug-mode')).toBe(true);
    });

    it('should suggest Rust-specific gates', () => {
      const stack: ProjectStack = {
        language: 'rust',
        linters: ['clippy'],
        formatters: ['rustfmt'],
        testFrameworks: ['cargo-test'],
        ci: [],
      };

      const config = suggestConfigForStack(stack);

      expect(config.customGates.some(g => g.name === 'no-unwrap')).toBe(true);
    });

    it('should suggest Go-specific gates', () => {
      const stack: ProjectStack = {
        language: 'go',
        linters: ['golangci-lint'],
        formatters: [],
        testFrameworks: ['go-test'],
        ci: [],
      };

      const config = suggestConfigForStack(stack);

      expect(config.customGates.some(g => g.name === 'no-goto')).toBe(true);
    });

    it('should disable test-coverage if no test framework', () => {
      const stack: ProjectStack = {
        language: 'javascript',
        linters: [],
        formatters: [],
        testFrameworks: [],
        ci: [],
      };

      const config = suggestConfigForStack(stack);

      expect(config.enabledGates).not.toContain('test-coverage');
    });

    it('should use conventional commits by default', () => {
      const stack: ProjectStack = {
        language: 'typescript',
        linters: [],
        formatters: [],
        testFrameworks: [],
        ci: [],
      };

      const config = suggestConfigForStack(stack);

      expect(config.conventions.commit_style).toBe('conventional');
      expect(config.conventions.allowed_types).toContain('feat');
      expect(config.conventions.allowed_types).toContain('fix');
    });
  });

  describe('formatStackSummary', () => {
    it('should format TypeScript + React stack', () => {
      const stack: ProjectStack = {
        language: 'typescript',
        framework: 'react',
        linters: ['eslint'],
        formatters: ['prettier'],
        testFrameworks: ['vitest'],
        ci: ['github-actions'],
      };

      const summary = formatStackSummary(stack);

      expect(summary).toContain('Typescript + React');
      expect(summary).toContain('Linters: eslint');
      expect(summary).toContain('Tests: vitest');
      expect(summary).toContain('CI: github-actions');
    });

    it('should format Python + Django stack', () => {
      const stack: ProjectStack = {
        language: 'python',
        framework: 'django',
        linters: ['ruff'],
        formatters: ['black'],
        testFrameworks: ['pytest'],
        ci: [],
      };

      const summary = formatStackSummary(stack);

      expect(summary).toContain('Python + Django');
    });

    it('should handle stack without framework', () => {
      const stack: ProjectStack = {
        language: 'go',
        linters: [],
        formatters: [],
        testFrameworks: ['go-test'],
        ci: [],
      };

      const summary = formatStackSummary(stack);

      expect(summary).toContain('Go');
      expect(summary).toContain('Tests: go-test');
    });

    it('should handle empty tooling', () => {
      const stack: ProjectStack = {
        language: 'rust',
        linters: [],
        formatters: [],
        testFrameworks: [],
        ci: [],
      };

      const summary = formatStackSummary(stack);

      expect(summary).toBe('Rust');
    });
  });
});
