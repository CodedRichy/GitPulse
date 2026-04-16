import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  recordRun,
  loadHistory,
  getAnalytics,
  getRecentRuns,
  clearTelemetry,
  getTelemetryStats,
  type TelemetryRecord,
} from '../telemetry.js';
import type { QualityReport, GateResult } from '../quality-gates.js';

describe('Telemetry', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitpulse-test-'));
    fs.mkdirSync(path.join(tempDir, '.gitpulse'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createMockReport = (score: number, passed: boolean): QualityReport => ({
    passed,
    overallScore: score,
    gates: [
      { gateName: 'security-scan', passed: true, score: 100, severity: 'critical', issues: [], suggestions: [], duration: 10 },
      { gateName: 'code-smells', passed: score > 70, score: score, severity: 'high', issues: [], suggestions: [], duration: 20 },
    ],
    totalIssues: passed ? 0 : 5,
    criticalIssues: 0,
    highIssues: passed ? 0 : 2,
    mediumIssues: passed ? 0 : 2,
    lowIssues: passed ? 0 : 1,
    duration: 30,
  });

  describe('recordRun', () => {
    it('should create telemetry file if not exists', () => {
      const report = createMockReport(90, true);

      recordRun(report, { branch: 'main', author: 'test' }, tempDir);

      const telemetryPath = path.join(tempDir, '.gitpulse', 'telemetry.jsonl');
      expect(fs.existsSync(telemetryPath)).toBe(true);
    });

    it('should append records to existing file', () => {
      const report1 = createMockReport(90, true);
      const report2 = createMockReport(80, false);

      recordRun(report1, { branch: 'main', author: 'test' }, tempDir);
      recordRun(report2, { branch: 'feature', author: 'test' }, tempDir);

      const history = loadHistory(undefined, tempDir);
      expect(history).toHaveLength(2);
    });

    it('should store correct data in record', () => {
      const report = createMockReport(85, true);

      recordRun(report, { branch: 'main', commitHash: 'abc123', author: 'alice' }, tempDir);

      const history = loadHistory(undefined, tempDir);
      const record = history[0];

      expect(record.branch).toBe('main');
      expect(record.commitHash).toBe('abc123');
      expect(record.author).toBe('alice');
      expect(record.score).toBe(85);
      expect(record.passed).toBe(true);
      expect(record.issues).toBe(0);
      expect(record.gates['security-scan']).toBe(100);
      expect(record.gates['code-smells']).toBe(85);
    });

    it('should include timestamp in ISO format', () => {
      const report = createMockReport(90, true);

      recordRun(report, { branch: 'main' }, tempDir);

      const history = loadHistory(undefined, tempDir);
      const record = history[0];

      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('loadHistory', () => {
    it('should return empty array if no telemetry file', () => {
      const history = loadHistory(undefined, tempDir);
      expect(history).toHaveLength(0);
    });

    it('should filter by days', () => {
      const now = new Date();

      // Create records for different dates
      const recentRecord: TelemetryRecord = {
        timestamp: now.toISOString(),
        branch: 'main',
        score: 90,
        gates: {},
        issues: 0,
        issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        passed: true,
        duration: 30,
      };

      const oldDate = new Date(now);
      oldDate.setDate(oldDate.getDate() - 10);
      const oldRecord: TelemetryRecord = {
        timestamp: oldDate.toISOString(),
        branch: 'main',
        score: 80,
        gates: {},
        issues: 5,
        issuesBySeverity: { critical: 0, high: 2, medium: 2, low: 1 },
        passed: false,
        duration: 30,
      };

      const telemetryPath = path.join(tempDir, '.gitpulse', 'telemetry.jsonl');
      fs.writeFileSync(telemetryPath, JSON.stringify(recentRecord) + '\n');
      fs.appendFileSync(telemetryPath, JSON.stringify(oldRecord) + '\n');

      const history7Days = loadHistory(7, tempDir);
      expect(history7Days).toHaveLength(1);
      expect(history7Days[0].score).toBe(90);

      const history30Days = loadHistory(30, tempDir);
      expect(history30Days).toHaveLength(2);
    });

    it('should sort by timestamp descending', async () => {
      const report1 = createMockReport(90, true);
      const report2 = createMockReport(80, true);

      recordRun(report1, { branch: 'main' }, tempDir);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));
      recordRun(report2, { branch: 'main' }, tempDir);

      const history = loadHistory(undefined, tempDir);
      expect(history[0].score).toBe(80); // Most recent first
      expect(history[1].score).toBe(90);
    });

    it('should skip corrupted lines', () => {
      const telemetryPath = path.join(tempDir, '.gitpulse', 'telemetry.jsonl');
      fs.writeFileSync(telemetryPath, '{"valid": true}\ninvalid json\n{"valid": true}\n');

      const history = loadHistory(undefined, tempDir);
      expect(history).toHaveLength(2);
    });
  });

  describe('getAnalytics', () => {
    it('should return zeros for empty history', () => {
      const analytics = getAnalytics(30, tempDir);

      expect(analytics.totalRuns).toBe(0);
      expect(analytics.averageScore).toBe(0);
      expect(analytics.passRate).toBe(0);
    });

    it('should calculate average score', () => {
      recordRun(createMockReport(90, true), { branch: 'main' }, tempDir);
      recordRun(createMockReport(80, true), { branch: 'main' }, tempDir);
      recordRun(createMockReport(100, true), { branch: 'main' }, tempDir);

      const analytics = getAnalytics(30, tempDir);

      expect(analytics.averageScore).toBe(90);
    });

    it('should calculate pass rate', () => {
      recordRun(createMockReport(90, true), { branch: 'main' }, tempDir);
      recordRun(createMockReport(90, true), { branch: 'main' }, tempDir);
      recordRun(createMockReport(50, false), { branch: 'main' }, tempDir);

      const analytics = getAnalytics(30, tempDir);

      expect(analytics.passRate).toBe(67); // 2/3 passed
    });

    it('should calculate gate averages', () => {
      const report: QualityReport = {
        passed: true,
        overallScore: 90,
        gates: [
          { gateName: 'security', passed: true, score: 100, severity: 'critical', issues: [], suggestions: [], duration: 10 },
          { gateName: 'tests', passed: true, score: 80, severity: 'medium', issues: [], suggestions: [], duration: 10 },
        ],
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        duration: 20,
      };

      recordRun(report, { branch: 'main' }, tempDir);
      recordRun(report, { branch: 'main' }, tempDir);

      const analytics = getAnalytics(30, tempDir);

      expect(analytics.gateAverages['security']).toBe(100);
      expect(analytics.gateAverages['tests']).toBe(80);
    });

    it('should calculate contributor stats', () => {
      recordRun(createMockReport(100, true), { branch: 'main', author: 'alice' }, tempDir);
      recordRun(createMockReport(80, false), { branch: 'main', author: 'bob' }, tempDir);
      recordRun(createMockReport(90, true), { branch: 'main', author: 'alice' }, tempDir);

      const analytics = getAnalytics(30, tempDir);

      expect(analytics.contributors).toBeDefined();
      expect(analytics.contributors?.['alice'].runs).toBe(2);
      expect(analytics.contributors?.['alice'].averageScore).toBe(95);
      expect(analytics.contributors?.['alice'].passRate).toBe(100);
      expect(analytics.contributors?.['bob'].averageScore).toBe(80);
      expect(analytics.contributors?.['bob'].passRate).toBe(0);
    });

    it('should set correct period dates', () => {
      recordRun(createMockReport(90, true), { branch: 'main' }, tempDir);

      const analytics = getAnalytics(30, tempDir);

      expect(analytics.period.days).toBe(30);
      expect(new Date(analytics.period.start)).toBeInstanceOf(Date);
      expect(new Date(analytics.period.end)).toBeInstanceOf(Date);
    });
  });

  describe('getRecentRuns', () => {
    it('should return most recent runs', () => {
      for (let i = 0; i < 25; i++) {
        recordRun(createMockReport(90, true), { branch: 'main' }, tempDir);
      }

      const recent = getRecentRuns(20, tempDir);

      expect(recent).toHaveLength(20);
    });

    it('should return all if fewer than limit', () => {
      recordRun(createMockReport(90, true), { branch: 'main' }, tempDir);
      recordRun(createMockReport(80, true), { branch: 'main' }, tempDir);

      const recent = getRecentRuns(20, tempDir);

      expect(recent).toHaveLength(2);
    });
  });

  describe('clearTelemetry', () => {
    it('should remove telemetry file', () => {
      recordRun(createMockReport(90, true), { branch: 'main' }, tempDir);

      clearTelemetry(tempDir);

      const telemetryPath = path.join(tempDir, '.gitpulse', 'telemetry.jsonl');
      expect(fs.existsSync(telemetryPath)).toBe(false);
    });

    it('should not throw if file does not exist', () => {
      expect(() => clearTelemetry(tempDir)).not.toThrow();
    });
  });

  describe('getTelemetryStats', () => {
    it('should return zeros if no telemetry file', () => {
      const stats = getTelemetryStats(tempDir);

      expect(stats.size).toBe(0);
      expect(stats.lines).toBe(0);
    });

    it('should return correct stats', () => {
      const report = createMockReport(90, true);
      recordRun(report, { branch: 'main' }, tempDir);

      const stats = getTelemetryStats(tempDir);

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.lines).toBe(1);
    });
  });
});
