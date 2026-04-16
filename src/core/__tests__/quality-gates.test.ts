import { describe, it, expect } from 'vitest';
import {
  SecurityScanGate,
  CodeSmellsGate,
  TestCoverageGate,
  DocumentationGate,
  QualityGatesEngine,
  type FileChange,
} from '../quality-gates.js';

// ─── Helpers ─────────────────────────────────────────────

function makeChange(overrides: Partial<FileChange> & { path: string }): FileChange {
  return {
    status: 'modified',
    ...overrides,
  };
}

// ─── SecurityScanGate ────────────────────────────────────

describe('SecurityScanGate', () => {
  const gate = new SecurityScanGate();

  it('detects hardcoded passwords', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/config.ts',
        content: 'const password = "SuperSecret123";',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].category).toBe('security');
    expect(result.issues[0].severity).toBe('critical');
    expect(result.passed).toBe(false);
  });

  it('detects hardcoded API keys', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/api.ts',
        content: 'const api_key = "sk-1234567890abcdef";',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(i => i.message.toLowerCase().includes('api key'))).toBe(true);
  });

  it('detects SQL injection via template literals', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/db.ts',
        content: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.message.toLowerCase().includes('sql injection'))).toBe(true);
  });

  it('detects innerHTML XSS', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/ui.ts',
        content: 'element.innerHTML = userInput;',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.message.toLowerCase().includes('xss'))).toBe(true);
  });

  it('detects eval usage', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/runtime.ts',
        content: 'const result = eval(codeString);',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.message.toLowerCase().includes('eval'))).toBe(true);
  });

  it('passes clean files with no issues', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/utils.ts',
        content: `
export function add(a: number, b: number): number {
  return a + b;
}
        `.trim(),
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.length).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('skips deleted files', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/old.ts',
        status: 'deleted',
        content: 'const password = "leaked";',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.length).toBe(0);
  });

  it('skips files without content', async () => {
    const changes: FileChange[] = [
      makeChange({ path: 'src/empty.ts' }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.length).toBe(0);
  });
});

// ─── CodeSmellsGate ──────────────────────────────────────

describe('CodeSmellsGate', () => {
  const gate = new CodeSmellsGate();

  it('detects files exceeding 500 lines', async () => {
    const longContent = Array(501).fill('const x = 1;').join('\n');
    const changes: FileChange[] = [
      makeChange({ path: 'src/big.ts', content: longContent }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.message.includes('500 lines'))).toBe(true);
  });

  it('detects TODO/FIXME comments', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/work.ts',
        content: '// TODO: fix this later\nconst x = 1;',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.message.includes('TODO/FIXME'))).toBe(true);
  });

  it('detects console.log statements', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/debug.ts',
        content: 'console.log("debugging");',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.message.includes('Console statement'))).toBe(true);
  });

  it('detects debugger statements', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/debug.ts',
        content: 'function test() {\n  debugger;\n  return 1;\n}',
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.message.includes('Debugger'))).toBe(true);
    expect(result.issues.some(i => i.severity === 'high')).toBe(true);
  });

  it('passes clean code', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/clean.ts',
        content: `
export function add(a: number, b: number): number {
  return a + b;
}
        `.trim(),
      }),
    ];
    const result = await gate.check(changes);
    const smellIssues = result.issues.filter(
      i => i.category === 'maintainability' || i.category === 'style'
    );
    expect(smellIssues.length).toBe(0);
  });

  it('skips non-code files for function length check', async () => {
    const longContent = Array(100).fill('some text').join('\n');
    const changes: FileChange[] = [
      makeChange({ path: 'docs/readme.md', content: longContent }),
    ];
    const result = await gate.check(changes);
    // Should not flag function length for .md files
    expect(result.issues.filter(i => i.message.includes('50 lines')).length).toBe(0);
  });
});

// ─── DocumentationGate ───────────────────────────────────

describe('DocumentationGate', () => {
  const gate = new DocumentationGate();

  it('detects exported functions without JSDoc', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/utils.ts',
        content: `export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.price, 0);
}`,
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.category === 'documentation')).toBe(true);
  });

  it('passes functions with JSDoc', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/utils.ts',
        content: `/**
 * Calculates the total price of items.
 */
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.price, 0);
}`,
      }),
    ];
    const result = await gate.check(changes);
    const docIssues = result.issues.filter(i => i.category === 'documentation');
    expect(docIssues.length).toBe(0);
  });

  it('always passes (documentation issues are warnings only)', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/noDoc.ts',
        content: 'export function noDoc() { return 1; }',
      }),
    ];
    const result = await gate.check(changes);
    // Documentation gate should never block
    expect(result.passed).toBe(true);
  });

  it('detects exported classes without JSDoc', async () => {
    const changes: FileChange[] = [
      makeChange({
        path: 'src/service.ts',
        content: `export class UserService {
  async getUser(id: string) { return null; }
}`,
      }),
    ];
    const result = await gate.check(changes);
    expect(result.issues.some(i => i.message.includes('UserService'))).toBe(true);
  });
});

// ─── QualityGatesEngine (integration) ────────────────────

describe('QualityGatesEngine', () => {
  it('has all default gates registered', () => {
    const engine = new QualityGatesEngine();
    const gates = engine.getRegisteredGates();
    expect(gates).toContain('security-scan');
    expect(gates).toContain('code-smells');
    expect(gates).toContain('test-coverage');
    expect(gates).toContain('documentation');
    expect(gates.length).toBe(4);
  });

  it('can add custom gates', () => {
    const engine = new QualityGatesEngine();
    engine.addGate({
      name: 'custom-gate',
      description: 'A custom gate',
      check: async () => ({
        gateName: 'custom-gate',
        passed: true,
        score: 100,
        severity: 'low' as const,
        issues: [],
        suggestions: [],
        duration: 0,
      }),
    });
    expect(engine.getRegisteredGates()).toContain('custom-gate');
    expect(engine.getRegisteredGates().length).toBe(5);
  });
});
