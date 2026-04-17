/**
 * Client-side telemetry and analytics utilities.
 * Fetches from cloud (Supabase) by default, or local CLI server when running.
 */

export interface TelemetryRecord {
  timestamp: string;
  branch: string;
  commitHash?: string;
  author?: string;
  score: number;
  gates: Record<string, number>;
  issues: number;
  issuesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  passed: boolean;
  duration: number;
}

export interface Analytics {
  period: {
    start: string;
    end: string;
    days: number;
  };
  totalRuns: number;
  averageScore: number;
  scoreTrend: number;
  passRate: number;
  gateAverages: Record<string, number>;
  topIssues: Array<{
    category: string;
    message: string;
    count: number;
  }>;
  contributors?: Record<string, {
    runs: number;
    averageScore: number;
    passRate: number;
  }>;
}

// Mock data for development
const mockTelemetry: TelemetryRecord[] = [
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    branch: 'main',
    commitHash: 'abc123',
    author: 'alice',
    score: 92,
    gates: {
      'security-scan': 100,
      'code-smells': 85,
      'test-coverage': 90,
      'documentation': 95,
    },
    issues: 2,
    issuesBySeverity: { critical: 0, high: 0, medium: 2, low: 0 },
    passed: true,
    duration: 1500,
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    branch: 'feature/new-ui',
    commitHash: 'def456',
    author: 'bob',
    score: 78,
    gates: {
      'security-scan': 100,
      'code-smells': 70,
      'test-coverage': 60,
      'documentation': 80,
    },
    issues: 5,
    issuesBySeverity: { critical: 0, high: 1, medium: 3, low: 1 },
    passed: false,
    duration: 2000,
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    branch: 'main',
    commitHash: 'ghi789',
    author: 'alice',
    score: 95,
    gates: {
      'security-scan': 100,
      'code-smells': 90,
      'test-coverage': 95,
      'documentation': 95,
    },
    issues: 1,
    issuesBySeverity: { critical: 0, high: 0, medium: 1, low: 0 },
    passed: true,
    duration: 1200,
  },
];

export async function getAnalytics(days: number = 30): Promise<{ analytics: Analytics; recentRuns: TelemetryRecord[] }> {
  // In production, this would call the CLI API
  // For now, return mock data

  const analytics: Analytics = {
    period: {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      days,
    },
    totalRuns: 42,
    averageScore: 86,
    scoreTrend: 5,
    passRate: 78,
    gateAverages: {
      'security-scan': 98,
      'code-smells': 82,
      'test-coverage': 75,
      'documentation': 88,
    },
    topIssues: [
      { category: 'code-smells', message: 'console.log found', count: 12 },
      { category: 'test-coverage', message: 'Missing tests for changed files', count: 8 },
      { category: 'documentation', message: 'Missing JSDoc', count: 5 },
    ],
    contributors: {
      'alice': { runs: 25, averageScore: 91, passRate: 88 },
      'bob': { runs: 17, averageScore: 78, passRate: 65 },
    },
  };

  return { analytics, recentRuns: mockTelemetry };
}

export async function getConfig(): Promise<{ config: any }> {
  try {
    const response = await fetch('/api/config', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch config');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch config from API, falling back to default:', error);
    // Fallback to default config
    return {
      config: {
        version: 1,
        tier: 'free',
        quality_gates: {
          'security-scan': { enabled: true, severity: 'critical' },
          'code-smells': { enabled: true, severity: 'high' },
          'test-coverage': { enabled: true, severity: 'medium' },
          'documentation': { enabled: true, severity: 'low' },
        },
        custom_gates: [],
        conventions: {
          commit_style: 'conventional',
          enforce_scope: false,
          allowed_types: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
          auto_learn: true,
        },
        hooks: {
          pre_commit: true,
          commit_msg: true,
        },
      },
    };
  }
}

export async function updateConfig(updates: any): Promise<{ success: boolean }> {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update config');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to update config:', error);
    return { success: false };
  }
}

// Cloud telemetry types (from Supabase)
export interface CloudTelemetryRecord {
  id: string;
  user_id: string;
  timestamp: string;
  repo_name?: string;
  branch?: string;
  commit_hash?: string;
  score: number;
  passed: boolean;
  duration_ms: number;
  gates: Record<string, number>;
  total_issues: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  client_version?: string;
  synced_at: string;
}

// Convert cloud record to local format
function cloudToLocalRecord(run: CloudTelemetryRecord): TelemetryRecord {
  return {
    timestamp: run.timestamp,
    branch: run.branch || 'unknown',
    commitHash: run.commit_hash,
    score: run.score,
    gates: run.gates || {},
    issues: run.total_issues,
    issuesBySeverity: {
      critical: run.critical_issues,
      high: run.high_issues,
      medium: run.medium_issues,
      low: run.low_issues,
    },
    passed: run.passed,
    duration: run.duration_ms,
  };
}

/**
 * Fetch telemetry from cloud (Supabase via API)
 */
export async function getCloudTelemetry(days: number = 30): Promise<{ analytics: Analytics; recentRuns: TelemetryRecord[] }> {
  try {
    const response = await fetch(`/api/telemetry?days=${days}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cloud telemetry');
    }

    const data = await response.json();
    
    return {
      analytics: data.analytics,
      recentRuns: (data.runs || []).map(cloudToLocalRecord),
    };
  } catch (error) {
    console.error('Cloud telemetry fetch failed:', error);
    // Fallback to mock data if cloud fails
    return getAnalytics(days);
  }
}
