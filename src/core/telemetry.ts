import * as fs from 'fs';
import * as path from 'path';
import type { QualityReport } from './quality-gates.js';
import { syncRunToCloud, isCloudSyncAvailable } from './cloud-sync.js';

/**
 * Telemetry record for a single quality gate run.
 * Stored in .gitpulse/telemetry.jsonl as append-only JSON lines.
 * Also synced to cloud when API key is configured.
 */
export interface TelemetryRecord {
  /** ISO timestamp of the run */
  timestamp: string;
  /** Git branch name */
  branch: string;
  /** Git commit hash (if commit was made) */
  commitHash?: string;
  /** Author of the commit/change */
  author?: string;
  /** Overall quality score (0-100) */
  score: number;
  /** Per-gate scores */
  gates: Record<string, number>;
  /** Number of issues found */
  issues: number;
  /** Breakdown of issues by severity */
  issuesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** Whether the gates passed */
  passed: boolean;
  /** Duration of the quality gate run in ms */
  duration: number;
}

/**
 * Analytics computed from telemetry data.
 */
export interface Analytics {
  /** Time period for the analytics */
  period: {
    start: string;
    end: string;
    days: number;
  };
  /** Total number of runs in the period */
  totalRuns: number;
  /** Average quality score */
  averageScore: number;
  /** Score trend (percentage change from first to last week) */
  scoreTrend: number;
  /** Pass rate percentage */
  passRate: number;
  /** Per-gate average scores */
  gateAverages: Record<string, number>;
  /** Top issues found (by frequency) */
  topIssues: Array<{
    category: string;
    message: string;
    count: number;
  }>;
  /** Contributor scores (for team tier) */
  contributors?: Record<string, {
    runs: number;
    averageScore: number;
    passRate: number;
  }>;
}

const TELEMETRY_FILENAME = 'telemetry.jsonl';
const GITPULSE_DIR = '.gitpulse';

/**
 * Get the path to the telemetry file.
 */
function getTelemetryPath(repoRoot?: string): string {
  const base = repoRoot || process.cwd();
  return path.join(base, GITPULSE_DIR, TELEMETRY_FILENAME);
}

/**
 * Record a quality gate run to telemetry.
 * Also syncs to cloud if API key is configured.
 */
export async function recordRun(
  report: QualityReport,
  commitInfo: {
    branch: string;
    commitHash?: string;
    author?: string;
  },
  repoRoot?: string
): Promise<void> {
  const telemetryPath = getTelemetryPath(repoRoot);
  const dir = path.dirname(telemetryPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Build gate scores map
  const gates: Record<string, number> = {};
  for (const gate of report.gates) {
    gates[gate.gateName] = gate.score;
  }

  const record: TelemetryRecord = {
    timestamp: new Date().toISOString(),
    branch: commitInfo.branch,
    commitHash: commitInfo.commitHash,
    author: commitInfo.author,
    score: report.overallScore,
    gates,
    issues: report.totalIssues,
    issuesBySeverity: {
      critical: report.criticalIssues,
      high: report.highIssues,
      medium: report.mediumIssues,
      low: report.lowIssues,
    },
    passed: report.passed,
    duration: report.duration,
  };

  // Append as JSON line (local-first)
  fs.appendFileSync(telemetryPath, JSON.stringify(record) + '\n');

  // Sync to cloud (non-blocking, don't fail if offline)
  if (repoRoot && isCloudSyncAvailable(repoRoot)) {
    try {
      const result = await syncRunToCloud(record, repoRoot);
      if (!result.success && result.error) {
        // Log sync failure but don't fail the commit
        console.error('Cloud sync warning:', result.error);
      }
    } catch {
      // Silent fail - local telemetry is source of truth
    }
  }
}

/**
 * Load telemetry history from the JSONL file.
 */
export function loadHistory(days?: number, repoRoot?: string): TelemetryRecord[] {
  const telemetryPath = getTelemetryPath(repoRoot);

  if (!fs.existsSync(telemetryPath)) {
    return [];
  }

  const content = fs.readFileSync(telemetryPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  const records: TelemetryRecord[] = [];
  for (const line of lines) {
    try {
      const record = JSON.parse(line) as TelemetryRecord;
      records.push(record);
    } catch {
      // Skip corrupted lines
    }
  }

  // Sort by timestamp descending (newest first)
  records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filter by days if specified
  if (days && days > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return records.filter(r => new Date(r.timestamp) >= cutoff);
  }

  return records;
}

/**
 * Compute analytics from telemetry data.
 */
export function getAnalytics(days: number = 30, repoRoot?: string): Analytics {
  const records = loadHistory(days, repoRoot);

  if (records.length === 0) {
    return {
      period: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        days,
      },
      totalRuns: 0,
      averageScore: 0,
      scoreTrend: 0,
      passRate: 0,
      gateAverages: {},
      topIssues: [],
    };
  }

  // Sort by timestamp ascending for trend calculation
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const startDate = new Date(sortedRecords[0].timestamp);
  const endDate = new Date(sortedRecords[sortedRecords.length - 1].timestamp);

  // Calculate averages
  const totalScore = records.reduce((sum, r) => sum + r.score, 0);
  const averageScore = Math.round(totalScore / records.length);

  // Calculate pass rate
  const passedRuns = records.filter(r => r.passed).length;
  const passRate = Math.round((passedRuns / records.length) * 100);

  // Calculate gate averages
  const gateScores: Record<string, number[]> = {};
  for (const record of records) {
    for (const [gateName, score] of Object.entries(record.gates)) {
      if (!gateScores[gateName]) {
        gateScores[gateName] = [];
      }
      gateScores[gateName].push(score);
    }
  }

  const gateAverages: Record<string, number> = {};
  for (const [gateName, scores] of Object.entries(gateScores)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    gateAverages[gateName] = Math.round(avg);
  }

  // Calculate score trend (compare first week to last week)
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const firstWeekEnd = startDate.getTime() + weekMs;
  const lastWeekStart = endDate.getTime() - weekMs;

  const firstWeekScores = records.filter(
    r => new Date(r.timestamp).getTime() <= firstWeekEnd
  ).map(r => r.score);

  const lastWeekScores = records.filter(
    r => new Date(r.timestamp).getTime() >= lastWeekStart
  ).map(r => r.score);

  const firstWeekAvg = firstWeekScores.length > 0
    ? firstWeekScores.reduce((a, b) => a + b, 0) / firstWeekScores.length
    : averageScore;

  const lastWeekAvg = lastWeekScores.length > 0
    ? lastWeekScores.reduce((a, b) => a + b, 0) / lastWeekScores.length
    : averageScore;

  const scoreTrend = firstWeekAvg > 0
    ? Math.round(((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100)
    : 0;

  // Calculate contributor stats (if authors present)
  const contributors: Record<string, { runs: number; totalScore: number; passed: number }> = {};
  for (const record of records) {
    if (record.author) {
      if (!contributors[record.author]) {
        contributors[record.author] = { runs: 0, totalScore: 0, passed: 0 };
      }
      contributors[record.author].runs++;
      contributors[record.author].totalScore += record.score;
      if (record.passed) {
        contributors[record.author].passed++;
      }
    }
  }

  const contributorAverages: Record<string, { runs: number; averageScore: number; passRate: number }> = {};
  for (const [author, stats] of Object.entries(contributors)) {
    contributorAverages[author] = {
      runs: stats.runs,
      averageScore: Math.round(stats.totalScore / stats.runs),
      passRate: Math.round((stats.passed / stats.runs) * 100),
    };
  }

  // Note: Top issues would require storing issue details in telemetry
  // For now, return empty array (can be enhanced later)
  const topIssues: Array<{ category: string; message: string; count: number }> = [];

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days,
    },
    totalRuns: records.length,
    averageScore,
    scoreTrend,
    passRate,
    gateAverages,
    topIssues,
    contributors: Object.keys(contributorAverages).length > 0 ? contributorAverages : undefined,
  };
}

/**
 * Get recent runs for the dashboard display.
 */
export function getRecentRuns(limit: number = 20, repoRoot?: string): TelemetryRecord[] {
  const records = loadHistory(undefined, repoRoot);
  return records.slice(0, limit);
}

/**
 * Clear all telemetry data (useful for testing or GDPR compliance).
 */
export function clearTelemetry(repoRoot?: string): void {
  const telemetryPath = getTelemetryPath(repoRoot);
  if (fs.existsSync(telemetryPath)) {
    fs.unlinkSync(telemetryPath);
  }
}

/**
 * Get telemetry file size and line count (for debugging/monitoring).
 */
export function getTelemetryStats(repoRoot?: string): { size: number; lines: number } {
  const telemetryPath = getTelemetryPath(repoRoot);

  if (!fs.existsSync(telemetryPath)) {
    return { size: 0, lines: 0 };
  }

  const stats = fs.statSync(telemetryPath);
  const content = fs.readFileSync(telemetryPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0).length;

  return { size: stats.size, lines };
}
