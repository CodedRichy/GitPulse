import { describe, it, expect } from 'vitest';
import { ConventionLearner } from '../convention-learner.js';

// ─── Casing Detection ────────────────────────────────────

describe('ConventionLearner — casing detection', () => {
  let learner: ConventionLearner;

  // Access private method via type assertion for testing
  function detectCasing(name: string): string {
    return (learner as any).detectCasing(name);
  }

  function matchesCasing(name: string, preferred: string): boolean {
    return (learner as any).matchesPreferredCasing(name, preferred);
  }

  beforeEach(() => {
    learner = new ConventionLearner();
  });

  it('detects camelCase', () => {
    expect(detectCasing('getUserName')).toBe('camelCase');
    expect(detectCasing('handleClick')).toBe('camelCase');
    expect(detectCasing('isReady')).toBe('camelCase');
  });

  it('detects PascalCase', () => {
    expect(detectCasing('GitOperations')).toBe('PascalCase');
    expect(detectCasing('UserService')).toBe('PascalCase');
    expect(detectCasing('App')).toBe('PascalCase');
  });

  it('detects snake_case', () => {
    expect(detectCasing('get_user_name')).toBe('snake_case');
    expect(detectCasing('max_retries')).toBe('snake_case');
  });

  it('detects kebab-case', () => {
    expect(detectCasing('my-component')).toBe('kebabCase');
    expect(detectCasing('user-service')).toBe('kebabCase');
  });

  it('validates camelCase matching', () => {
    expect(matchesCasing('getUserName', 'camelCase')).toBe(true);
    expect(matchesCasing('GetUserName', 'camelCase')).toBe(false);
    expect(matchesCasing('get_user_name', 'camelCase')).toBe(false);
  });

  it('validates PascalCase matching', () => {
    expect(matchesCasing('UserService', 'PascalCase')).toBe(true);
    expect(matchesCasing('userService', 'PascalCase')).toBe(false);
  });

  it('validates snake_case matching', () => {
    expect(matchesCasing('get_user_name', 'snake_case')).toBe(true);
    expect(matchesCasing('getUserName', 'snake_case')).toBe(false);
  });

  it('validates kebab-case matching', () => {
    expect(matchesCasing('my-component', 'kebab-case')).toBe(true);
    expect(matchesCasing('myComponent', 'kebab-case')).toBe(false);
  });

  it('accepts any casing for mixed mode', () => {
    expect(matchesCasing('anything', 'mixed')).toBe(true);
    expect(matchesCasing('AnythingElse', 'mixed')).toBe(true);
  });
});

// ─── Convention Checking ─────────────────────────────────

describe('ConventionLearner — convention checking', () => {
  let learner: ConventionLearner;

  beforeEach(() => {
    learner = new ConventionLearner();
  });

  it('returns empty violations when no conventions loaded', () => {
    const violations = learner.checkConventions('src/test.ts', 'const x = 1;');
    expect(violations).toEqual([]);
  });
});

// ─── Convention Context for Prompt ───────────────────────

describe('ConventionLearner — prompt context generation', () => {
  let learner: ConventionLearner;

  beforeEach(() => {
    learner = new ConventionLearner();
  });

  it('returns empty string when no conventions loaded', () => {
    const context = learner.generatePromptContext(['src/test.ts']);
    expect(context).toBe('');
  });

  it('returns empty string for empty file paths', () => {
    const context = learner.generatePromptContext([]);
    expect(context).toBe('');
  });
});

// ─── Context for Specific Files ──────────────────────────

describe('ConventionLearner — getConventionsForContext', () => {
  let learner: ConventionLearner;

  beforeEach(() => {
    learner = new ConventionLearner();
  });

  it('returns empty context when no conventions loaded', () => {
    const context = learner.getConventionsForContext('src/test.ts');
    expect(context.relevantConventions).toEqual([]);
    expect(context.similarCommits).toEqual([]);
    expect(context.relatedFiles).toEqual([]);
    expect(context.suggestedScopes).toEqual([]);
    expect(context.architecturalGuidance).toEqual([]);
  });
});

// ─── Name Suggestions ────────────────────────────────────

describe('ConventionLearner — suggestName', () => {
  let learner: ConventionLearner;

  beforeEach(() => {
    learner = new ConventionLearner();
  });

  it('returns empty string when no conventions loaded', () => {
    const suggestion = learner.suggestName('function', 'get user');
    expect(suggestion).toBe('');
  });
});

// ─── Singleton Access ────────────────────────────────────

describe('ConventionLearner — singleton', () => {
  it('exports getConventionLearner', async () => {
    const { getConventionLearner } = await import('../convention-learner.js');
    const instance1 = getConventionLearner();
    const instance2 = getConventionLearner();
    expect(instance1).toBe(instance2);
  });
});
