import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Lockfile, LockfileError, withLock } from '../lockfile.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Lockfile', () => {
  const testDir = path.join(__dirname, '.test-lock-repo');

  beforeEach(() => {
    // Create fresh test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('Lock Acquisition', () => {
    it('should acquire lock successfully', async () => {
      const lockfile = new Lockfile(testDir);
      const result = await lockfile.acquire();

      expect(result.acquired).toBe(true);
      expect(result.release).toBeInstanceOf(Function);
      
      // Verify lock directory exists
      const lockPath = path.join(testDir, '.gitpulse', 'lock');
      expect(fs.existsSync(lockPath)).toBe(true);

      result.release();
    });

    it('should fail to acquire lock if already held', async () => {
      const lockfile1 = new Lockfile(testDir);
      const result1 = await lockfile1.acquire();
      expect(result1.acquired).toBe(true);

      // Second lock attempt should fail
      const lockfile2 = new Lockfile(testDir, { retries: 1, retryInterval: 10 });
      const result2 = await lockfile2.acquire();

      expect(result2.acquired).toBe(false);
      expect(result2.error).toContain('Lock held by another gitpulse instance');

      result1.release();
    });

    it('should write lock info file', async () => {
      const lockfile = new Lockfile(testDir);
      const result = await lockfile.acquire();

      expect(result.acquired).toBe(true);

      const infoPath = path.join(testDir, '.gitpulse', 'lock.info');
      expect(fs.existsSync(infoPath)).toBe(true);

      const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
      expect(info.pid).toBe(process.pid);
      expect(info.timestamp).toBeTypeOf('number');
      expect(info.command).toBeTypeOf('string');

      result.release();
    });
  });

  describe('Lock Release', () => {
    it('should release lock and cleanup', async () => {
      const lockfile = new Lockfile(testDir);
      const result = await lockfile.acquire();

      result.release();

      const lockPath = path.join(testDir, '.gitpulse', 'lock');
      const infoPath = path.join(testDir, '.gitpulse', 'lock.info');

      expect(fs.existsSync(lockPath)).toBe(false);
      expect(fs.existsSync(infoPath)).toBe(false);
    });

    it('should allow re-acquisition after release', async () => {
      const lockfile = new Lockfile(testDir);
      
      // First acquisition
      const result1 = await lockfile.acquire();
      expect(result1.acquired).toBe(true);
      result1.release();

      // Second acquisition should succeed
      const result2 = await lockfile.acquire();
      expect(result2.acquired).toBe(true);
      result2.release();
    });
  });

  describe('Stale Lock Detection', () => {
    it('should detect and override stale lock', async () => {
      // Create a stale lock manually
      const gitpulseDir = path.join(testDir, '.gitpulse');
      fs.mkdirSync(gitpulseDir, { recursive: true });
      
      const lockPath = path.join(gitpulseDir, 'lock');
      const infoPath = path.join(gitpulseDir, 'lock.info');
      
      fs.mkdirSync(lockPath);
      fs.writeFileSync(infoPath, JSON.stringify({
        pid: 99999, // Non-existent process
        timestamp: Date.now() - 60000, // 60 seconds ago (beyond stale threshold)
        command: 'test',
      }));

      // Try to acquire with short stale duration
      const lockfile = new Lockfile(testDir, { 
        retries: 1, 
        staleDuration: 1000 // 1 second
      });
      
      const result = await lockfile.acquire();
      expect(result.acquired).toBe(true);
      
      result.release();
    });
  });

  describe('Retry Logic', () => {
    it('should retry lock acquisition', async () => {
      const lockfile1 = new Lockfile(testDir);
      const result1 = await lockfile1.acquire();
      expect(result1.acquired).toBe(true);

      // Release after short delay
      setTimeout(() => result1.release(), 200);

      // Second lock with retries should eventually succeed
      const lockfile2 = new Lockfile(testDir, { 
        retries: 10, 
        retryInterval: 50 
      });
      
      const result2 = await lockfile2.acquire();
      expect(result2.acquired).toBe(true);
      
      result2.release();
    });
  });

  describe('withLock helper', () => {
    it('should execute function with lock', async () => {
      let executed = false;
      
      const result = await withLock(testDir, async () => {
        executed = true;
        return 'success';
      });

      expect(executed).toBe(true);
      expect(result).toBe('success');

      // Lock should be released
      const lockPath = path.join(testDir, '.gitpulse', 'lock');
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should release lock even if function throws', async () => {
      await expect(
        withLock(testDir, async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      // Lock should still be released
      const lockPath = path.join(testDir, '.gitpulse', 'lock');
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should throw LockfileError if lock cannot be acquired', async () => {
      // Hold lock with first instance
      const lockfile = new Lockfile(testDir);
      const result = await lockfile.acquire();
      expect(result.acquired).toBe(true);

      // Try withLock while lock held
      await expect(
        withLock(testDir, async () => 'never runs', { retries: 1 })
      ).rejects.toThrow(LockfileError);

      result.release();
    });
  });

  describe('LockfileError', () => {
    it('should have correct name and message', () => {
      const error = new LockfileError('Custom error message');
      
      expect(error.name).toBe('LockfileError');
      expect(error.message).toBe('Custom error message');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
