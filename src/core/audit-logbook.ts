import * as fs from 'fs';
import * as path from 'path';

/**
 * Audit Logbook: Local-First Audit Trail
 * 
 * Stores quality gate results, overrides, and commit history locally.
 * Privacy-first: No data leaves the machine unless explicitly exported.
 */

export interface AuditEntry {
  id: string;
  timestamp: number;
  commitHash?: string;
  branch?: string;
  qualityScore: number;
  passed: boolean;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  issues: Array<{
    severity: string;
    category: string;
    file: string;
    message: string;
  }>;
  override?: {
    justification: string;
    timestamp: number;
  };
  duration: number;
}

export interface AuditLogbookData {
  entries: AuditEntry[];
  version: string;
}

export class AuditLogbook {
  private auditPath: string;
  private maxEntries: number;

  constructor(repoPath: string = '.', maxEntries: number = 1000) {
    this.auditPath = path.join(repoPath, '.gitpulse', 'audit.json');
    this.maxEntries = maxEntries;
    this.ensureDirectory();
  }

  /**
   * Ensure .gitpulse directory exists
   */
  private ensureDirectory(): void {
    const dir = path.dirname(this.auditPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Load audit logbook from disk
   */
  load(): AuditLogbookData {
    try {
      if (fs.existsSync(this.auditPath)) {
        const content = fs.readFileSync(this.auditPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // If file is corrupted, start fresh
    }
    return {
      entries: [],
      version: '1.0',
    };
  }

  /**
   * Save audit logbook to disk
   */
  private save(logbook: AuditLogbookData): void {
    this.ensureDirectory();
    fs.writeFileSync(this.auditPath, JSON.stringify(logbook, null, 2));
  }

  /**
   * Add a new audit entry
   */
  addEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): string {
    const logbook = this.load();
    const newEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    // Add new entry at the beginning
    logbook.entries.unshift(newEntry);

    // Trim to max entries
    if (logbook.entries.length > this.maxEntries) {
      logbook.entries = logbook.entries.slice(0, this.maxEntries);
    }

    this.save(logbook);
    return newEntry.id;
  }

  /**
   * Add an override justification to an existing entry
   */
  addOverride(entryId: string, justification: string): void {
    const logbook = this.load();
    const entry = logbook.entries.find(e => e.id === entryId);
    
    if (entry) {
      entry.override = {
        justification,
        timestamp: Date.now(),
      };
      this.save(logbook);
    }
  }

  /**
   * Get recent audit entries
   */
  getRecent(limit: number = 50): AuditEntry[] {
    const logbook = this.load();
    return logbook.entries.slice(0, limit);
  }

  /**
   * Get audit entry by ID
   */
  getEntry(id: string): AuditEntry | undefined {
    const logbook = this.load();
    return logbook.entries.find(e => e.id === id);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    totalOverrides: number;
    averageQualityScore: number;
    criticalIssuesCount: number;
    passRate: number;
  } {
    const logbook = this.load();
    const entries = logbook.entries;

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        totalOverrides: 0,
        averageQualityScore: 100,
        criticalIssuesCount: 0,
        passRate: 100,
      };
    }

    const totalOverrides = entries.filter(e => e.override).length;
    const totalScore = entries.reduce((sum, e) => sum + e.qualityScore, 0);
    const criticalIssuesCount = entries.reduce((sum, e) => sum + e.criticalIssues, 0);
    const passedCount = entries.filter(e => e.passed).length;

    return {
      totalEntries: entries.length,
      totalOverrides,
      averageQualityScore: Math.round(totalScore / entries.length),
      criticalIssuesCount,
      passRate: Math.round((passedCount / entries.length) * 100),
    };
  }

  /**
   * Clear all audit entries
   */
  clear(): void {
    const empty: AuditLogbookData = {
      entries: [],
      version: '1.0',
    };
    this.save(empty);
  }

  /**
   * Export audit log as JSON
   */
  export(): string {
    const logbook: AuditLogbookData = this.load();
    return JSON.stringify(logbook, null, 2);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AuditLogbook;
