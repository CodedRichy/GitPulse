import * as fs from 'fs';
import * as path from 'path';

/**
 * Detected project stack information.
 */
export interface ProjectStack {
  /** Primary language */
  language: string;
  /** Framework (if detected) */
  framework?: string;
  /** Runtime (Node, Deno, Bun, etc.) */
  runtime?: string;
  /** Detected linters */
  linters: string[];
  /** Detected formatters */
  formatters: string[];
  /** Detected CI/CD systems */
  ci: string[];
  /** Detected test frameworks */
  testFrameworks: string[];
  /** Package manager */
  packageManager?: string;
}

/**
 * Suggested quality gate configuration based on stack.
 */
export interface SuggestedConfig {
  /** Enabled gates */
  enabledGates: string[];
  /** Custom gates specific to this stack */
  customGates: Array<{
    name: string;
    description: string;
    pattern: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    include?: string[];
  }>;
  /** Convention settings */
  conventions: {
    commit_style: 'conventional' | 'semantic' | 'simple';
    allowed_types: string[];
  };
}

/**
 * Detect the project stack by analyzing manifest files.
 */
export function detectProjectStack(repoRoot: string): ProjectStack {
  const stack: ProjectStack = {
    language: 'unknown',
    linters: [],
    formatters: [],
    ci: [],
    testFrameworks: [],
  };

  // Check for package.json (Node.js)
  const packageJsonPath = path.join(repoRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    stack.language = 'javascript';
    stack.runtime = 'node';
    stack.packageManager = detectPackageManager(repoRoot);

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Detect framework
      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        stack.framework = 'nextjs';
      } else if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        stack.framework = 'react';
      } else if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
        stack.framework = 'vue';
      } else if (packageJson.dependencies?.['@angular/core'] || packageJson.devDependencies?.['@angular/core']) {
        stack.framework = 'angular';
      } else if (packageJson.dependencies?.svelte || packageJson.devDependencies?.svelte) {
        stack.framework = 'svelte';
      } else if (packageJson.dependencies?.express || packageJson.devDependencies?.express) {
        stack.framework = 'express';
      }

      // Detect test frameworks
      if (packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest) {
        stack.testFrameworks.push('vitest');
      }
      if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
        stack.testFrameworks.push('jest');
      }
      if (packageJson.devDependencies?.mocha || packageJson.dependencies?.mocha) {
        stack.testFrameworks.push('mocha');
      }
      if (packageJson.devDependencies?.['@playwright/test']) {
        stack.testFrameworks.push('playwright');
      }
      if (packageJson.devDependencies?.cypress) {
        stack.testFrameworks.push('cypress');
      }

      // Detect linters
      if (packageJson.devDependencies?.eslint || packageJson.dependencies?.eslint) {
        stack.linters.push('eslint');
      }
      if (packageJson.devDependencies?.['@typescript-eslint/parser']) {
        stack.linters.push('typescript-eslint');
      }

      // Detect formatters
      if (packageJson.devDependencies?.prettier || packageJson.dependencies?.prettier) {
        stack.formatters.push('prettier');
      }
    } catch {
      // Invalid package.json
    }
  }

  // Check for TypeScript
  if (fs.existsSync(path.join(repoRoot, 'tsconfig.json'))) {
    if (stack.language === 'javascript') {
      stack.language = 'typescript';
    }
  }

  // Check for Python
  if (fs.existsSync(path.join(repoRoot, 'pyproject.toml')) ||
      fs.existsSync(path.join(repoRoot, 'requirements.txt')) ||
      fs.existsSync(path.join(repoRoot, 'setup.py')) ||
      fs.existsSync(path.join(repoRoot, 'Pipfile'))) {
    stack.language = 'python';
    stack.runtime = 'python';

    // Detect framework
    const pyprojectPath = path.join(repoRoot, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const pyproject = fs.readFileSync(pyprojectPath, 'utf-8');
        if (pyproject.includes('django')) stack.framework = 'django';
        else if (pyproject.includes('flask')) stack.framework = 'flask';
        else if (pyproject.includes('fastapi')) stack.framework = 'fastapi';
      } catch {
        // Error reading file
      }
    }

    // Detect test frameworks
    if (fs.existsSync(path.join(repoRoot, 'pytest.ini'))) {
      stack.testFrameworks.push('pytest');
    }
    // Also check pyproject.toml for pytest configuration
    if (fs.existsSync(pyprojectPath)) {
      try {
        const pyproject = fs.readFileSync(pyprojectPath, 'utf-8');
        if (pyproject.includes('[tool.pytest') || pyproject.includes('pytest')) {
          if (!stack.testFrameworks.includes('pytest')) {
            stack.testFrameworks.push('pytest');
          }
        }
      } catch {
        // Error reading file
      }
    }
    if (fs.existsSync(path.join(repoRoot, 'tox.ini'))) {
      stack.testFrameworks.push('tox');
    }

    // Detect linters
    if (fs.existsSync(path.join(repoRoot, '.pylintrc'))) {
      stack.linters.push('pylint');
    }
    if (fs.existsSync(path.join(repoRoot, 'pyproject.toml'))) {
      try {
        const pyproject = fs.readFileSync(pyprojectPath, 'utf-8');
        if (pyproject.includes('ruff')) stack.linters.push('ruff');
        if (pyproject.includes('flake8')) stack.linters.push('flake8');
        if (pyproject.includes('black')) stack.formatters.push('black');
        if (pyproject.includes('isort')) stack.formatters.push('isort');
      } catch {
        // Error reading file
      }
    }
  }

  // Check for Rust
  if (fs.existsSync(path.join(repoRoot, 'Cargo.toml'))) {
    stack.language = 'rust';
    stack.runtime = 'rust';

    // Rust has built-in testing
    stack.testFrameworks.push('cargo-test');

    // Check for additional tools
    if (fs.existsSync(path.join(repoRoot, 'rustfmt.toml')) ||
        fs.existsSync(path.join(repoRoot, '.rustfmt.toml'))) {
      stack.formatters.push('rustfmt');
    }
    if (fs.existsSync(path.join(repoRoot, 'clippy.toml'))) {
      stack.linters.push('clippy');
    }
  }

  // Check for Go
  if (fs.existsSync(path.join(repoRoot, 'go.mod'))) {
    stack.language = 'go';
    stack.runtime = 'go';

    // Go has built-in testing
    stack.testFrameworks.push('go-test');

    // Check for common tools
    try {
      const goMod = fs.readFileSync(path.join(repoRoot, 'go.mod'), 'utf-8');
      if (goMod.includes('golangci-lint') || fs.existsSync(path.join(repoRoot, '.golangci.yml'))) {
        stack.linters.push('golangci-lint');
      }
    } catch {
      // Error reading file
    }
  }

  // Check for Java
  if (fs.existsSync(path.join(repoRoot, 'pom.xml')) ||
      fs.existsSync(path.join(repoRoot, 'build.gradle')) ||
      fs.existsSync(path.join(repoRoot, 'build.gradle.kts'))) {
    stack.language = 'java';
    stack.runtime = 'jvm';

    // Detect build tool
    if (fs.existsSync(path.join(repoRoot, 'pom.xml'))) {
      stack.packageManager = 'maven';
    } else if (fs.existsSync(path.join(repoRoot, 'build.gradle')) ||
               fs.existsSync(path.join(repoRoot, 'build.gradle.kts'))) {
      stack.packageManager = 'gradle';
    }

    // Common Java test frameworks are usually in the build files
    stack.testFrameworks.push('junit');
  }

  // Detect CI/CD
  const ciConfigs = [
    { name: 'github-actions', paths: ['.github/workflows'] },
    { name: 'gitlab-ci', paths: ['.gitlab-ci.yml'] },
    { name: 'circleci', paths: ['.circleci/config.yml'] },
    { name: 'travis', paths: ['.travis.yml'] },
    { name: 'jenkins', paths: ['Jenkinsfile'] },
    { name: 'azure-pipelines', paths: ['azure-pipelines.yml'] },
  ];

  for (const ci of ciConfigs) {
    for (const ciPath of ci.paths) {
      if (fs.existsSync(path.join(repoRoot, ciPath))) {
        stack.ci.push(ci.name);
        break;
      }
    }
  }

  return stack;
}

/**
 * Detect the package manager used in a Node.js project.
 */
function detectPackageManager(repoRoot: string): string | undefined {
  if (fs.existsSync(path.join(repoRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(repoRoot, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(repoRoot, 'package-lock.json'))) {
    return 'npm';
  }
  if (fs.existsSync(path.join(repoRoot, 'bun.lockb'))) {
    return 'bun';
  }
  return undefined;
}

/**
 * Generate suggested quality gate configuration based on detected stack.
 */
export function suggestConfigForStack(stack: ProjectStack): SuggestedConfig {
  const config: SuggestedConfig = {
    enabledGates: ['security-scan', 'code-smells', 'test-coverage', 'documentation'],
    customGates: [],
    conventions: {
      commit_style: 'conventional',
      allowed_types: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'ci', 'perf', 'build', 'revert'],
    },
  };

  // Language-specific custom gates
  switch (stack.language) {
    case 'javascript':
    case 'typescript':
      // React/Next.js specific gates
      if (stack.framework === 'react' || stack.framework === 'nextjs') {
        config.customGates.push({
          name: 'no-console-in-components',
          description: 'Avoid console statements in React components',
          pattern: 'console\\.(log|warn|error|debug)',
          severity: 'medium',
          include: ['src/**/*.{tsx,jsx}', 'components/**/*.{tsx,jsx}'],
        });
        config.customGates.push({
          name: 'require-error-boundary',
          description: 'Pages should have ErrorBoundary',
          pattern: 'export default function.*Page',
          severity: 'medium',
          include: ['src/app/**/*.tsx', 'src/pages/**/*.tsx', 'app/**/*.tsx', 'pages/**/*.tsx'],
        });
      }

      // Node.js specific gates
      if (stack.framework === 'express' || !stack.framework) {
        config.customGates.push({
          name: 'no-process-exit',
          description: 'Avoid process.exit() in application code',
          pattern: 'process\\.exit\\(',
          severity: 'high',
        });
      }
      break;

    case 'python':
      config.customGates.push({
        name: 'no-print-statements',
        description: 'Use logging instead of print()',
        pattern: '^\\s*print\\(',
        severity: 'low',
        include: ['src/**/*.py', '**/*.py'],
      });

      if (stack.framework === 'django' || stack.framework === 'flask') {
        config.customGates.push({
          name: 'no-debug-mode',
          description: 'Debug mode should not be enabled in production',
          pattern: 'DEBUG\\s*=\\s*True',
          severity: 'critical',
          include: ['**/settings.py', '**/config.py'],
        });
      }
      break;

    case 'rust':
      config.customGates.push({
        name: 'no-unwrap',
        description: 'Avoid unwrap() - use proper error handling',
        pattern: '\\.unwrap\\(\\)',
        severity: 'medium',
        include: ['src/**/*.rs'],
      });
      break;

    case 'go':
      config.customGates.push({
        name: 'no-goto',
        description: 'Avoid goto statements',
        pattern: '\\bgoto\\b',
        severity: 'medium',
        include: ['**/*.go'],
      });
      break;
  }

  // Adjust enabled gates based on existing tooling
  if (stack.linters.includes('eslint') || stack.linters.includes('ruff')) {
    // If they have a good linter, code-smells might be redundant
    // But we'll keep it for now as it catches different things
  }

  if (stack.testFrameworks.length === 0) {
    // Disable test coverage if no test framework detected
    config.enabledGates = config.enabledGates.filter(g => g !== 'test-coverage');
  }

  return config;
}

/**
 * Generate a human-readable summary of the detected stack.
 */
export function formatStackSummary(stack: ProjectStack): string {
  const parts: string[] = [];

  parts.push(`${capitalize(stack.language)}${stack.framework ? ` + ${capitalize(stack.framework)}` : ''}`);

  if (stack.linters.length > 0) {
    parts.push(`Linters: ${stack.linters.join(', ')}`);
  }

  if (stack.testFrameworks.length > 0) {
    parts.push(`Tests: ${stack.testFrameworks.join(', ')}`);
  }

  if (stack.ci.length > 0) {
    parts.push(`CI: ${stack.ci.join(', ')}`);
  }

  return parts.join(' | ');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
