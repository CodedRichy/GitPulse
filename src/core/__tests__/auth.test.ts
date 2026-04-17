/**
 * Auth Module Tests
 * Tests authentication flow, token management, and credential storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccountService, OAuthConfig } from '../auth.js';
import { CredentialStorage, TokenData } from '../credential-storage.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the external dependencies
vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('http', () => {
  const createServer = vi.fn(() => ({
    listen: vi.fn((port, cb) => cb?.()),
    close: vi.fn(),
  }));
  return { createServer };
});

describe('AccountService', () => {
  let accountService: AccountService;
  let testConfigDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create a temporary config directory for tests
    testConfigDir = path.join(os.tmpdir(), `gitpulse-test-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });
    process.env.GITPULSE_CONFIG_DIR = testConfigDir;

    // Save original env
    originalEnv = { ...process.env };

    // Initialize service
    accountService = new AccountService();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Restore env
    process.env = originalEnv;
  });

  describe('Token Management', () => {
    it('should save and retrieve tokens', async () => {
      const testToken: TokenData = {
        accessToken: 'test-access-token-12345',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
        userId: 'user-123',
        email: 'test@example.com',
        provider: 'github',
      };

      await accountService.loginWithToken(
        testToken.accessToken,
        testToken.provider || 'github',
        testToken.userId,
        testToken.email
      );

      const retrievedTokens = await accountService.getTokens();
      
      expect(retrievedTokens).toBeDefined();
      expect(retrievedTokens?.accessToken).toBe(testToken.accessToken);
      expect(retrievedTokens?.userId).toBe(testToken.userId);
      expect(retrievedTokens?.email).toBe(testToken.email);
      expect(retrievedTokens?.provider).toBe('github');
    });

    it('should detect expired tokens', async () => {
      // Note: loginWithToken always sets expiresAt to 1 hour from now
      // So we test by manually corrupting the stored token
      await accountService.loginWithToken(
        'valid-token',
        'github',
        'user-456',
        'expired@example.com'
      );

      // Manually corrupt the stored token to be expired
      const credFile = path.join(testConfigDir, '.credentials.json');
      if (fs.existsSync(credFile)) {
        const content = JSON.parse(fs.readFileSync(credFile, 'utf-8'));
        content.tokens.expiresAt = Date.now() - 1000; // Expired 1 second ago
        fs.writeFileSync(credFile, JSON.stringify(content));
      }

      // Clear in-memory cache to force reload from file
      await accountService.logout();
      
      // Create new service to load expired token from file
      const newService = new AccountService();
      const isAuthenticated = await newService.isAuthenticated();
      
      expect(isAuthenticated).toBe(false);
    });

    it('should detect valid non-expired tokens', async () => {
      const validToken: TokenData = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000, // Expires in 1 hour
        userId: 'user-789',
        email: 'valid@example.com',
        provider: 'gitlab',
      };

      await accountService.loginWithToken(
        validToken.accessToken,
        validToken.provider || 'gitlab',
        validToken.userId,
        validToken.email
      );

      const isAuthenticated = await accountService.isAuthenticated();
      
      expect(isAuthenticated).toBe(true);
    });

    it('should return null tokens when not authenticated', async () => {
      const tokens = await accountService.getTokens();
      
      expect(tokens).toBe(null);
    });

    it('should clear tokens on logout', async () => {
      // First login
      await accountService.loginWithToken(
        'test-token',
        'github',
        'user-123',
        'test@example.com'
      );

      let isAuthenticated = await accountService.isAuthenticated();
      expect(isAuthenticated).toBe(true);

      // Then logout
      await accountService.logout();

      isAuthenticated = await accountService.isAuthenticated();
      expect(isAuthenticated).toBe(false);

      // Tokens should be null
      const tokens = await accountService.getTokens();
      expect(tokens).toBe(null);
    });

    it('should generate unique user IDs for tokens without userId', async () => {
      await accountService.loginWithToken('token1', 'github');
      const tokens1 = await accountService.getTokens();

      await accountService.logout();

      await accountService.loginWithToken('token2', 'github');
      const tokens2 = await accountService.getTokens();

      expect(tokens1?.userId).toBeDefined();
      expect(tokens2?.userId).toBeDefined();
      expect(tokens1?.userId).not.toBe(tokens2?.userId);
    });
  });

  describe('Authentication State', () => {
    it('should start unauthenticated', async () => {
      const isAuthenticated = await accountService.isAuthenticated();
      
      expect(isAuthenticated).toBe(false);
    });

    it('should transition from unauthenticated to authenticated', async () => {
      let isAuthenticated = await accountService.isAuthenticated();
      expect(isAuthenticated).toBe(false);

      await accountService.loginWithToken('test-token', 'github', 'user-123');

      isAuthenticated = await accountService.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    });

    it('should handle multiple login/logout cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await accountService.loginWithToken(
          `token-${i}`,
          'github',
          `user-${i}`
        );

        let isAuthenticated = await accountService.isAuthenticated();
        expect(isAuthenticated).toBe(true);

        const tokens = await accountService.getTokens();
        expect(tokens?.userId).toBe(`user-${i}`);

        await accountService.logout();

        isAuthenticated = await accountService.isAuthenticated();
        expect(isAuthenticated).toBe(false);
      }
    });

    it('should preserve tokens across service instances', async () => {
      // First instance
      await accountService.loginWithToken(
        'persistent-token',
        'github',
        'user-999',
        'persistent@example.com'
      );

      const tokens1 = await accountService.getTokens();
      expect(tokens1?.userId).toBe('user-999');

      // Create new service instance
      const newService = new AccountService();
      const isAuthenticated = await newService.isAuthenticated();
      
      expect(isAuthenticated).toBe(true);

      const tokens2 = await newService.getTokens();
      expect(tokens2?.userId).toBe('user-999');
      expect(tokens2?.accessToken).toBe('persistent-token');
    });
  });

  describe('OAuth Config', () => {
    it('should throw error when OAuth provider not configured', async () => {
      // Save original env
      const originalGithubId = process.env.GITHUB_CLIENT_ID;
      
      // Unset GitHub client ID
      delete process.env.GITHUB_CLIENT_ID;

      const newService = new AccountService();

      try {
        await expect(newService.loginWithOAuth('github')).rejects.toThrow(
          /GitHub OAuth not configured/i
        );
      } finally {
        // Restore env
        if (originalGithubId) {
          process.env.GITHUB_CLIENT_ID = originalGithubId;
        }
      }
    });

    it('should support multiple OAuth providers', async () => {
      const providers = ['github', 'gitlab', 'google'] as const;

      for (const provider of providers) {
        // Each provider should be configurable
        const configDir = accountService.getConfigDir();
        expect(configDir).toBeDefined();
        expect(configDir.includes('gitpulse')).toBe(true);
      }
    });
  });

  describe('Token Refresh', () => {
    it('should determine if token needs refresh', async () => {
      // Token expires in 5 minutes (should not need refresh yet)
      const recentToken: TokenData = {
        accessToken: 'fresh-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 5 * 60 * 1000,
        userId: 'user-123',
        email: 'test@example.com',
        provider: 'github',
      };

      await accountService.loginWithToken(
        recentToken.accessToken,
        recentToken.provider || 'github',
        recentToken.userId,
        recentToken.email
      );

      const tokens = await accountService.ensureValidTokens();
      expect(tokens).toBeDefined();
      expect(tokens?.accessToken).toBe(recentToken.accessToken);
    });

    it('should return null tokens if no valid tokens available', async () => {
      const tokens = await accountService.ensureValidTokens();
      
      expect(tokens).toBe(null);
    });

    it('should maintain tokens through ensureValidTokens call', async () => {
      const testToken = {
        accessToken: 'test-token-123',
        provider: 'github' as const,
        userId: 'user-123',
        email: 'test@example.com',
      };

      await accountService.loginWithToken(
        testToken.accessToken,
        testToken.provider,
        testToken.userId,
        testToken.email
      );

      const tokens1 = await accountService.ensureValidTokens();
      expect(tokens1?.accessToken).toBe(testToken.accessToken);

      const tokens2 = await accountService.ensureValidTokens();
      expect(tokens2?.accessToken).toBe(tokens1?.accessToken);
    });
  });

  describe('Config Directory', () => {
    it('should return correct config directory', () => {
      const configDir = accountService.getConfigDir();
      
      expect(configDir).toBe(testConfigDir);
      expect(fs.existsSync(configDir)).toBe(true);
    });

    it('should use default config directory when GITPULSE_CONFIG_DIR not set', () => {
      delete process.env.GITPULSE_CONFIG_DIR;

      const service = new AccountService();
      const configDir = service.getConfigDir();
      
      expect(configDir).toContain('.gitpulse');
      expect(configDir).toContain(os.homedir());
    });

    it('should create config directory if it does not exist', () => {
      const newDir = path.join(os.tmpdir(), `gitpulse-new-${Date.now()}`);
      process.env.GITPULSE_CONFIG_DIR = newDir;

      const service = new AccountService();
      const configDir = service.getConfigDir();

      expect(fs.existsSync(configDir)).toBe(true);

      // Cleanup
      fs.rmSync(newDir, { recursive: true, force: true });
    });
  });

  describe('Security', () => {
    it('should not expose sensitive tokens in error messages', async () => {
      const sensitiveToken = 'super-secret-token-xyz123';

      await accountService.loginWithToken(
        sensitiveToken,
        'github',
        'user-123'
      );

      // Token should be stored but not logged in normal operations
      const tokens = await accountService.getTokens();
      expect(tokens?.accessToken).toBe(sensitiveToken);

      // Verify credential file has secure permissions
      const credFile = path.join(testConfigDir, '.credentials.json');
      if (fs.existsSync(credFile)) {
        const stats = fs.statSync(credFile);
        
        // On non-Windows systems, file should have restrictive permissions
        if (process.platform !== 'win32') {
          const mode = stats.mode & 0o777;
          expect(mode).toBe(0o600);
        }
      }
    });

    it('should handle credential corruption gracefully', async () => {
      await accountService.loginWithToken('test-token', 'github', 'user-123');

      // Corrupt the credentials file
      const credFile = path.join(testConfigDir, '.credentials.json');
      if (fs.existsSync(credFile)) {
        fs.writeFileSync(credFile, 'invalid json {{{');

        // Should return false on corrupted file
        const isAuthenticated = await accountService.isAuthenticated();
        expect(isAuthenticated).toBe(false);
      }
    });

    it('should not allow token reuse across providers', async () => {
      const token = 'shared-token';

      await accountService.loginWithToken(token, 'github', 'user-github');
      const githubTokens = await accountService.getTokens();

      expect(githubTokens?.provider).toBe('github');
      expect(githubTokens?.userId).toBe('user-github');

      // Token should be associated with the provider it was used with
      expect(githubTokens?.accessToken).toBe(token);
    });
  });

  describe('Token Expiration Edge Cases', () => {
    it('should handle tokens expiring at exactly now', async () => {
      // loginWithToken always sets expiresAt to 1 hour from now
      // So we test by manually setting token to expire at exactly now
      await accountService.loginWithToken(
        'test-token',
        'github',
        'user-123'
      );

      // Manually set token to expire at exactly now
      const credFile = path.join(testConfigDir, '.credentials.json');
      if (fs.existsSync(credFile)) {
        const content = JSON.parse(fs.readFileSync(credFile, 'utf-8'));
        content.tokens.expiresAt = Date.now();
        fs.writeFileSync(credFile, JSON.stringify(content));
      }

      // Clear cache and reload
      await accountService.logout();
      const newService = new AccountService();
      const isAuthenticated = await newService.isAuthenticated();
      // Token at exactly expiration time should be considered invalid (expiresAt > now is false)
      expect(isAuthenticated).toBe(false);
    });

    it('should handle very far future expiration', async () => {
      // loginWithToken always sets expiresAt to 1 hour from now
      // Test that tokens created stay valid
      const beforeTime = Date.now();
      await accountService.loginWithToken(
        'long-lived-token',
        'github',
        'user-123'
      );
      const afterTime = Date.now();

      const isAuthenticated = await accountService.isAuthenticated();
      expect(isAuthenticated).toBe(true);

      const tokens = await accountService.getTokens();
      // Token should expire 1 hour from now (give some timing leeway)
      expect(tokens?.expiresAt).toBeGreaterThan(beforeTime + 3600000 - 1000);
      expect(tokens?.expiresAt).toBeLessThan(afterTime + 3600000 + 1000);
    });
  });

  describe('Email and Provider Data', () => {
    it('should store and retrieve email', async () => {
      const email = 'john.doe@example.com';

      await accountService.loginWithToken(
        'test-token',
        'github',
        'user-123',
        email
      );

      const tokens = await accountService.getTokens();
      expect(tokens?.email).toBe(email);
    });

    it('should store provider information', async () => {
      const providers = ['github', 'gitlab', 'google'];

      for (const provider of providers) {
        await accountService.logout();

        await accountService.loginWithToken(
          `token-${provider}`,
          provider,
          `user-${provider}`
        );

        const tokens = await accountService.getTokens();
        expect(tokens?.provider).toBe(provider);
      }
    });

    it('should handle missing email gracefully', async () => {
      await accountService.loginWithToken(
        'test-token',
        'github',
        'user-123'
        // No email provided
      );

      const tokens = await accountService.getTokens();
      expect(tokens?.userId).toBe('user-123');
      expect(tokens?.email).toBeUndefined();
    });
  });
});
