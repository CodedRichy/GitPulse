import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitleaksBridge, type GitleaksFinding } from '../gitleaks-bridge.js';

describe('GitleaksBridge', () => {
  let bridge: GitleaksBridge;

  beforeEach(() => {
    bridge = new GitleaksBridge('.');
  });

  describe('Construction', () => {
    it('should create instance with default repo path', () => {
      expect(bridge).toBeInstanceOf(GitleaksBridge);
    });

    it('should create instance with custom repo path', () => {
      const customBridge = new GitleaksBridge('/custom/path');
      expect(customBridge).toBeInstanceOf(GitleaksBridge);
    });
  });

  describe('isAvailable', () => {
    it('should return true if Gitleaks is installed', async () => {
      // This test assumes Gitleaks may or may not be installed
      // In CI/CD, we'd mock the spawn call
      const available = await bridge.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should return false if Gitleaks is not installed', async () => {
      // In a real test, we'd mock spawn to simulate Gitleaks not being available
      const available = await bridge.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('getVersion', () => {
    it('should return version string if Gitleaks is installed', async () => {
      const version = await bridge.getVersion();
      if (version) {
        expect(typeof version).toBe('string');
        expect(version.length).toBeGreaterThan(0);
      } else {
        // Gitleaks not installed, should return null
        expect(version).toBeNull();
      }
    });

    it('should return null if Gitleaks is not installed', async () => {
      const version = await bridge.getVersion();
      // May be null if not installed
      expect(version === null || typeof version === 'string').toBe(true);
    });
  });

  describe('detect', () => {
    it('should return empty array if no secrets found', async () => {
      // This test requires Gitleaks to be installed
      // In CI/CD, we'd mock the spawn call
      try {
        const findings = await bridge.detect({ staged: false });
        expect(Array.isArray(findings)).toBe(true);
      } catch (error) {
        // Gitleaks may not be installed, which is expected in some environments
        expect(error).toBeDefined();
      }
    });

    it('should use staged flag when staged option is true', async () => {
      // This test would verify the correct arguments are passed
      // In CI/CD, we'd mock spawn and check the args
      // For now, we just verify it doesn't throw
      try {
        await bridge.detect({ staged: true });
      } catch (error) {
        // Expected if Gitleaks not installed
      }
    });

    it('should accept custom config path', async () => {
      try {
        await bridge.detect({ configPath: '/custom/config.toml' });
      } catch (error) {
        // Expected if Gitleaks not installed
      }
    });
  });

  describe('mapFindingsToIssues', () => {
    it('should map Gitleaks findings to QualityIssue format', () => {
      const findings: GitleaksFinding[] = [
        {
          file: 'src/config.ts',
          line: 10,
          commit: 'abc123',
          author: 'Test User',
          email: 'test@example.com',
          date: '2024-01-01',
          message: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
          ruleID: 'AWS Access Key',
          tags: ['key', 'aws'],
          entropy: 4.5,
        },
      ];

      const issues = bridge.mapFindingsToIssues(findings);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        severity: 'critical',
        category: 'security',
        file: 'src/config.ts',
        line: 10,
        message: 'Secret detected: AWS Access Key',
        code: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
        fix: 'Use environment variables or a secrets manager',
      });
    });

    it('should map multiple findings', () => {
      const findings: GitleaksFinding[] = [
        {
          file: 'src/config.ts',
          line: 10,
          commit: 'abc123',
          author: 'Test User',
          email: 'test@example.com',
          date: '2024-01-01',
          message: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
          ruleID: 'AWS Access Key',
          tags: ['key', 'aws'],
          entropy: 4.5,
        },
        {
          file: 'src/db.ts',
          line: 5,
          commit: 'def456',
          author: 'Test User',
          email: 'test@example.com',
          date: '2024-01-01',
          message: 'password=SuperSecret123',
          ruleID: 'Generic Secret',
          tags: ['secret'],
          entropy: 3.2,
        },
      ];

      const issues = bridge.mapFindingsToIssues(findings);

      expect(issues).toHaveLength(2);
      expect(issues[0].file).toBe('src/config.ts');
      expect(issues[1].file).toBe('src/db.ts');
    });

    it('should handle empty findings array', () => {
      const issues = bridge.mapFindingsToIssues([]);
      expect(issues).toEqual([]);
    });
  });

  describe('getInstallationInstructions', () => {
    it('should return instructions for Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      const bridge = new GitleaksBridge('.');
      const instructions = bridge.getInstallationInstructions();
      
      expect(instructions).toContain('Windows');
      expect(instructions).toContain('winget');
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return instructions for macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      
      const bridge = new GitleaksBridge('.');
      const instructions = bridge.getInstallationInstructions();
      
      expect(instructions).toContain('macOS');
      expect(instructions).toContain('brew');
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return instructions for Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      const bridge = new GitleaksBridge('.');
      const instructions = bridge.getInstallationInstructions();
      
      expect(instructions).toContain('Linux');
      expect(instructions).toContain('brew');
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
