/**
 * Cloud sync module for GitPulse CLI
 * Syncs telemetry runs to the deployed web dashboard
 * 
 * Similar to Claude Code's telemetry sync - CLI pushes to cloud,
 * web dashboard reads from cloud. Enables viewing analytics
 * even when CLI is not running.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as path from 'path';
import { createHash } from 'crypto';
import type { TelemetryRecord } from './telemetry.js';

// GitPulse cloud API endpoint
const CLOUD_API_URL = process.env.GITPULSE_API_URL || 'https://gitpulse.io/api/telemetry';

interface SyncConfig {
  apiKey: string;
  enabled: boolean;
}

interface SyncResult {
  success: boolean;
  id?: string;
  error?: string;
  warning?: string;
}

/**
 * Load sync configuration from .gitpulse/config.json
 * User stores API key locally (like Claude Code stores auth token)
 */
export function loadSyncConfig(repoRoot: string): SyncConfig | null {
  const configPath = join(repoRoot, '.gitpulse', 'config.json');
  
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return {
      apiKey: config.api_key,
      enabled: config.cloud_sync !== false, // default to true if key exists
    };
  } catch {
    return null;
  }
}

/**
 * Hash repo path for privacy (don't expose full local paths to cloud)
 */
function hashRepoPath(repoPath: string): string {
  return createHash('sha256').update(repoPath).digest('hex');
}

/**
 * Validates that a path is within the expected directory (prevents path traversal)
 */
function isPathWithinDirectory(targetPath: string, baseDir: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  const relative = path.relative(resolvedBase, resolvedTarget);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Extract repo name from remote origin URL or local path
 */
function extractRepoName(repoRoot: string): string | undefined {
  try {
    // Try to read from git config
    const gitConfigPath = join(repoRoot, '.git', 'config');
    // Security: Validate git config path is within repo to prevent path traversal
    if (isPathWithinDirectory(gitConfigPath, repoRoot) && existsSync(gitConfigPath)) {
      const config = readFileSync(gitConfigPath, 'utf-8');
      const match = config.match(/url = .+\/(.+?)\.git/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Fall back to directory name
  }
  
  // Fallback: use directory name
  const parts = repoRoot.split(/[\\/]/);
  return parts[parts.length - 1];
}

/**
 * Sync a telemetry run to the cloud
 * Called automatically after each quality gate run
 */
export async function syncRunToCloud(
  record: TelemetryRecord,
  repoRoot: string,
  clientVersion: string = '0.1.0'
): Promise<SyncResult> {
  const config = loadSyncConfig(repoRoot);
  
  if (!config || !config.apiKey) {
    return { 
      success: false, 
      error: 'No API key configured. Run "gitpulse config --set-api-key" to enable cloud sync.' 
    };
  }

  if (!config.enabled) {
    return { 
      success: false, 
      error: 'Cloud sync disabled in config' 
    };
  }

  try {
    const repoName = extractRepoName(repoRoot);
    const repoPathHash = hashRepoPath(repoRoot);

    const payload = {
      timestamp: record.timestamp,
      repo_name: repoName,
      repo_path_hash: repoPathHash,
      branch: record.branch,
      commit_hash: record.commitHash,
      score: record.score,
      passed: record.passed,
      duration_ms: record.duration,
      gates: record.gates,
      total_issues: record.issues,
      critical_issues: record.issuesBySeverity?.critical || 0,
      high_issues: record.issuesBySeverity?.high || 0,
      medium_issues: record.issuesBySeverity?.medium || 0,
      low_issues: record.issuesBySeverity?.low || 0,
      client_version: clientVersion,
    };

    const response = await fetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-GitPulse-Client-Version': clientVersion,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Handle specific error cases
      if (response.status === 401) {
        return { 
          success: false, 
          error: 'Invalid API key. Please check your API key in Settings.' 
        };
      }
      
      if (response.status === 429) {
        return { 
          success: false, 
          error: 'Rate limited. Sync will retry on next run.' 
        };
      }

      return { 
        success: false, 
        error: errorData.error || `HTTP ${response.status}` 
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      id: data.id,
      warning: data.warning,
    };

  } catch (error) {
    // Network errors (offline, etc.) - don't fail the CLI run
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error during sync' 
    };
  }
}

/**
 * Check if cloud sync is available (has valid API key)
 */
export function isCloudSyncAvailable(repoRoot: string): boolean {
  const config = loadSyncConfig(repoRoot);
  return !!config?.apiKey && config.enabled;
}

/**
 * Get sync status for display in CLI
 */
export function getCloudSyncStatus(repoRoot: string): {
  available: boolean;
  enabled: boolean;
  message: string;
  teamContext?: string;
} {
  const config = loadSyncConfig(repoRoot);
  
  if (!config?.apiKey) {
    return {
      available: false,
      enabled: false,
      message: 'Cloud sync not configured',
    };
  }

  if (!config.enabled) {
    return {
      available: true,
      enabled: false,
      message: 'Cloud sync disabled',
    };
  }

  // Detect if this might be a team API key based on key format
  // Team API keys start with 'gp_team_' (optional convention)
  const isTeamKey = config.apiKey.startsWith('gp_team_');

  return {
    available: true,
    enabled: true,
    message: isTeamKey ? 'Cloud sync active (team workspace)' : 'Cloud sync active (personal workspace)',
    teamContext: isTeamKey ? 'team' : 'personal',
  };
}

/**
 * Detect if API key is a team key (for routing telemetry)
 * Note: Actual team detection happens server-side via API key lookup
 */
export function isTeamApiKey(repoRoot: string): boolean {
  const config = loadSyncConfig(repoRoot);
  return !!config?.apiKey?.startsWith('gp_team_');
}
