import * as fs from 'fs';
import * as path from 'path';

/**
 * Lockfile: Concurrency Mutex for GitPulse
 * 
 * Prevents multiple gitpulse instances from running simultaneously,
 * which could cause race conditions in git operations.
 * 
 * Uses atomic mkdir-based locking for cross-platform safety.
 */

export interface LockOptions {
  retries?: number;
  retryInterval?: number; // milliseconds
  staleDuration?: number; // milliseconds, lock considered stale after this
}

export interface LockResult {
  acquired: boolean;
  release: () => void;
  error?: string;
}

const DEFAULT_OPTIONS: Required<LockOptions> = {
  retries: 3,
  retryInterval: 100,
  staleDuration: 30000, // 30 seconds
};

export class Lockfile {
  private lockPath: string;
  private options: Required<LockOptions>;
  private lockInfoPath: string;

  constructor(
    repoPath: string = '.',
    options: LockOptions = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.lockPath = path.join(repoPath, '.gitpulse', 'lock');
    this.lockInfoPath = path.join(repoPath, '.gitpulse', 'lock.info');
    
    // Ensure .gitpulse directory exists
    const gitpulseDir = path.join(repoPath, '.gitpulse');
    if (!fs.existsSync(gitpulseDir)) {
      fs.mkdirSync(gitpulseDir, { recursive: true });
    }
  }

  /**
   * Acquire a lock with retries
   */
  async acquire(): Promise<LockResult> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.options.retries; attempt++) {
      const result = this.tryAcquire();
      
      if (result.acquired) {
        return result;
      }

      lastError = result.error;

      // Check if lock is stale
      if (this.isLockStale()) {
        // Force release and try again
        this.forceRelease();
        const retryResult = this.tryAcquire();
        if (retryResult.acquired) {
          return retryResult;
        }
      }

      // Wait before retry
      if (attempt < this.options.retries - 1) {
        await this.sleep(this.options.retryInterval);
      }
    }

    return {
      acquired: false,
      release: () => {}, // No-op
      error: lastError || 'Unable to acquire lock after retries',
    };
  }

  /**
   * Try to acquire lock immediately (no retries)
   */
  private tryAcquire(): LockResult {
    try {
      // Try to create lock directory atomically
      fs.mkdirSync(this.lockPath, { recursive: false });
      
      // Write lock info (PID, timestamp)
      const lockInfo = {
        pid: process.pid,
        timestamp: Date.now(),
        command: process.argv.slice(2).join(' '),
      };
      fs.writeFileSync(this.lockInfoPath, JSON.stringify(lockInfo, null, 2));

      // Setup cleanup on process exit
      this.setupCleanup();

      return {
        acquired: true,
        release: () => this.release(),
      };
    } catch (err) {
      // Lock directory already exists
      const error = this.getLockOwnerInfo();
      return {
        acquired: false,
        release: () => {},
        error: `Lock held by another gitpulse instance${error ? `: ${error}` : ''}`,
      };
    }
  }

  /**
   * Release the lock
   */
  release(): void {
    try {
      if (fs.existsSync(this.lockInfoPath)) {
        fs.unlinkSync(this.lockInfoPath);
      }
      if (fs.existsSync(this.lockPath)) {
        fs.rmdirSync(this.lockPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Force release a lock (use with caution)
   */
  private forceRelease(): void {
    this.release();
  }

  /**
   * Check if current lock is stale (process died without cleanup)
   */
  private isLockStale(): boolean {
    try {
      if (!fs.existsSync(this.lockInfoPath)) {
        return true; // No info file, lock is orphaned
      }

      const info = JSON.parse(fs.readFileSync(this.lockInfoPath, 'utf-8'));
      const lockAge = Date.now() - info.timestamp;
      
      if (lockAge > this.options.staleDuration) {
        return true; // Lock is older than stale duration
      }

      // Check if process is still alive
      if (info.pid && !this.isProcessRunning(info.pid)) {
        return true; // Process died
      }

      return false;
    } catch {
      return true; // Error reading info, assume stale
    }
  }

  /**
   * Get information about who holds the lock
   */
  private getLockOwnerInfo(): string | undefined {
    try {
      if (fs.existsSync(this.lockInfoPath)) {
        const info = JSON.parse(fs.readFileSync(this.lockInfoPath, 'utf-8'));
        return `PID ${info.pid} at ${new Date(info.timestamp).toISOString()}`;
      }
    } catch {
      // Ignore
    }
    return undefined;
  }

  /**
   * Check if a process is still running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      // process.kill(pid, 0) checks if process exists without actually killing it
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Setup cleanup handlers for process exit
   */
  private setupCleanup(): void {
    const cleanup = () => {
      this.release();
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(1);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(1);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      cleanup();
      console.error('Uncaught exception:', err);
      process.exit(1);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Convenience function to acquire lock with automatic release
 */
export async function withLock<T>(
  repoPath: string,
  fn: () => Promise<T>,
  options?: LockOptions
): Promise<T> {
  const lockfile = new Lockfile(repoPath, options);
  const result = await lockfile.acquire();

  if (!result.acquired) {
    throw new LockfileError(result.error || 'Failed to acquire lock');
  }

  try {
    return await fn();
  } finally {
    result.release();
  }
}

/**
 * Custom error class for lockfile errors
 */
export class LockfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockfileError';
  }
}

export default Lockfile;
