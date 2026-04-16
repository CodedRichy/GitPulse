import { describe, it, expect } from 'vitest';
import { CustomGate, validateCustomGate, loadCustomGates } from '../custom-gate.js';
import { CustomGateConfig } from '../gitpulse-config.js';
import type { FileChange } from '../quality-gates.js';

const createFileChange = (path: string, content: string): FileChange => ({
  path,
  status: 'modified',
  content,
});

describe('CustomGate', () => {
  describe('pattern matching', () => {
    it('should detect console.log statements', async () => {
      const config: CustomGateConfig = {
        name: 'no-console-logs',
        description: 'Block console.log in production',
        pattern: 'console\\.log',
        severity: 'medium',
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/app.ts', 'console.log("debug");'),
      ];

      const result = await gate.check(changes);

      expect(result.passed).toBe(true); // medium severity doesn't fail
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].message).toContain('Block console.log');
      expect(result.issues[0].line).toBe(1);
    });

    it('should detect multiple violations in same file', async () => {
      const config: CustomGateConfig = {
        name: 'no-todos',
        description: 'Block TODO comments',
        pattern: 'TODO|FIXME',
        severity: 'low',
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/code.ts', '// TODO: fix this\n// FIXME: also this'),
      ];

      const result = await gate.check(changes);

      expect(result.issues).toHaveLength(2);
    });

    it('should pass when no violations found', async () => {
      const config: CustomGateConfig = {
        name: 'no-eval',
        description: 'Block eval() usage',
        pattern: 'eval\\(',
        severity: 'high',
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/safe.ts', 'const x = 1 + 1;'),
      ];

      const result = await gate.check(changes);

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.score).toBe(100);
    });
  });

  describe('severity handling', () => {
    it('should fail on critical severity violations in strict mode', async () => {
      const config: CustomGateConfig = {
        name: 'no-secrets',
        description: 'Block hardcoded secrets',
        pattern: 'password\\s*=\\s*["\'][^"\']+["\']',
        severity: 'critical',
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/config.ts', 'const password = "secret123";'),
      ];

      const result = await gate.check(changes);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should fail on high severity violations', async () => {
      const config: CustomGateConfig = {
        name: 'no-debugger',
        description: 'Block debugger statements',
        pattern: 'debugger;',
        severity: 'high',
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/code.ts', 'function test() { debugger; }'),
      ];

      const result = await gate.check(changes);

      expect(result.passed).toBe(false);
    });
  });

  describe('include/exclude globs', () => {
    it('should only check included files', async () => {
      const config: CustomGateConfig = {
        name: 'no-console-src',
        description: 'Block console in src/',
        pattern: 'console\\.log',
        severity: 'medium',
        include: ['src/*.ts'],
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/app.ts', 'console.log("yes");'),
        createFileChange('tests/app.test.ts', 'console.log("no");'),
      ];

      const result = await gate.check(changes);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].file).toBe('src/app.ts');
    });

    it('should skip excluded files', async () => {
      const config: CustomGateConfig = {
        name: 'no-console-prod',
        description: 'Block console except in tests',
        pattern: 'console\\.log',
        severity: 'medium',
        exclude: ['*.test.ts', '*.spec.ts'],
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/app.ts', 'console.log("yes");'),
        createFileChange('tests/app.test.ts', 'console.log("no");'),
      ];

      const result = await gate.check(changes);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].file).toBe('src/app.ts');
    });

    it('should respect both include and exclude', async () => {
      const config: CustomGateConfig = {
        name: 'specific-check',
        description: 'Check specific files',
        pattern: 'TODO',
        severity: 'low',
        include: ['src/*.ts'],
        exclude: ['src/vendor.ts'],
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/app.ts', '// TODO'),
        createFileChange('src/vendor.ts', '// TODO'),
        createFileChange('tests/app.test.ts', '// TODO'),
      ];

      const result = await gate.check(changes);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].file).toBe('src/app.ts');
    });
  });

  describe('must_coexist pattern', () => {
    it('should pass if must_coexist pattern is found', async () => {
      const config: CustomGateConfig = {
        name: 'require-error-boundary',
        description: 'Pages need ErrorBoundary',
        pattern: 'export default function.*Page',
        must_coexist: 'ErrorBoundary',
        severity: 'high',
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/pages/Home.tsx', `
          import { ErrorBoundary } from './ErrorBoundary';
          export default function HomePage() { return <div>Home</div>; }
        `),
      ];

      const result = await gate.check(changes);

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail if must_coexist pattern is missing', async () => {
      const config: CustomGateConfig = {
        name: 'require-error-boundary',
        description: 'Pages need ErrorBoundary',
        pattern: 'export default function.*Page',
        must_coexist: 'ErrorBoundary',
        severity: 'high',
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/pages/Home.tsx', `
          export default function HomePage() { return <div>Home</div>; }
        `),
      ];

      const result = await gate.check(changes);

      expect(result.passed).toBe(false);
      expect(result.issues).toHaveLength(1);
    });
  });

  describe('custom message and fix', () => {
    it('should use custom message when provided', async () => {
      const config: CustomGateConfig = {
        name: 'custom-msg',
        description: 'Test gate',
        pattern: 'eval\\(',
        severity: 'high',
        message: 'Do not use eval() - use JSON.parse instead',
        fix: 'Replace eval() with JSON.parse() or safe parsing',
      };

      const gate = new CustomGate(config);
      const changes: FileChange[] = [
        createFileChange('src/app.ts', 'eval("code");'),
      ];

      const result = await gate.check(changes);

      expect(result.issues[0].message).toBe('Do not use eval() - use JSON.parse instead');
      expect(result.issues[0].fix).toBe('Replace eval() with JSON.parse() or safe parsing');
    });
  });
});

describe('validateCustomGate', () => {
  it('should validate a correct config', () => {
    const config: CustomGateConfig = {
      name: 'test-gate',
      description: 'Test',
      pattern: 'test',
      severity: 'medium',
    };

    const result = validateCustomGate(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require name', () => {
    const config = {
      name: '',
      description: 'Test',
      pattern: 'test',
      severity: 'medium',
    } as CustomGateConfig;

    const result = validateCustomGate(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Custom gate must have a name');
  });

  it('should require pattern', () => {
    const config = {
      name: 'test',
      description: 'Test',
      pattern: '',
      severity: 'medium',
    } as CustomGateConfig;

    const result = validateCustomGate(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Custom gate must have a pattern');
  });

  it('should validate regex pattern', () => {
    const config: CustomGateConfig = {
      name: 'test',
      description: 'Test',
      pattern: '[invalid',
      severity: 'medium',
    };

    const result = validateCustomGate(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid regex pattern: [invalid');
  });

  it('should require description', () => {
    const config = {
      name: 'test',
      description: '',
      pattern: 'test',
      severity: 'medium',
    } as CustomGateConfig;

    const result = validateCustomGate(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Custom gate must have a description');
  });

  it('should validate severity', () => {
    const config = {
      name: 'test',
      description: 'Test',
      pattern: 'test',
      severity: 'invalid' as any,
    };

    const result = validateCustomGate(config);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid severity'))).toBe(true);
  });
});

describe('loadCustomGates', () => {
  it('should return empty array for undefined config', () => {
    const gates = loadCustomGates(undefined);
    expect(gates).toHaveLength(0);
  });

  it('should return empty array for empty config', () => {
    const gates = loadCustomGates([]);
    expect(gates).toHaveLength(0);
  });

  it('should load multiple gates', () => {
    const configs: CustomGateConfig[] = [
      { name: 'gate1', description: 'First', pattern: 'test1', severity: 'low' },
      { name: 'gate2', description: 'Second', pattern: 'test2', severity: 'high' },
    ];

    const gates = loadCustomGates(configs);

    expect(gates).toHaveLength(2);
    expect(gates[0].name).toBe('custom:gate1');
    expect(gates[1].name).toBe('custom:gate2');
  });
});
