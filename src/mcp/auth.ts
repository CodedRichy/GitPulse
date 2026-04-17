/**
 * MCP (Model Context Protocol) Authentication & Authorization
 *
 * Provides secure token management and request validation for MCP connections.
 * Prevents unauthorized access to git repositories and sensitive data.
 */

import crypto from 'crypto';

export interface MCPToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
  scope: string[]; // e.g., ['repo:read', 'commit:suggest', 'review:read']
  clientName?: string;
  lastUsed?: Date;
}

export interface MCPRequest {
  token: string;
  method: string;
  args?: Record<string, unknown>;
}

export class MCPAuthManager {
  private tokens = new Map<string, MCPToken>();
  private tokenFile: string;

  constructor(tokenFile: string = '.gitpulse/mcp-tokens.json') {
    this.tokenFile = tokenFile;
    this.loadTokens();
  }

  /**
   * Generate a new MCP token
   */
  generateToken(
    scope: string[] = ['repo:read', 'commit:suggest'],
    expiresInDays: number = 365,
    clientName?: string
  ): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();

    this.tokens.set(token, {
      token,
      createdAt: now,
      expiresAt: new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000),
      scope,
      clientName,
    });

    this.saveTokens();
    return token;
  }

  /**
   * Validate a token and check permissions
   */
  validateToken(token: string, requiredScope?: string): {
    valid: boolean;
    error?: string;
    tokenData?: MCPToken;
  } {
    if (!token || token.trim().length === 0) {
      return { valid: false, error: 'No token provided' };
    }

    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return { valid: false, error: 'Invalid token' };
    }

    // Check expiration
    if (new Date() > tokenData.expiresAt) {
      this.tokens.delete(token);
      this.saveTokens();
      return { valid: false, error: 'Token expired' };
    }

    // Check scope if required
    if (requiredScope && !tokenData.scope.includes(requiredScope)) {
      return { valid: false, error: `Token does not have '${requiredScope}' scope` };
    }

    // Update last used timestamp
    tokenData.lastUsed = new Date();
    this.saveTokens();

    return { valid: true, tokenData };
  }

  /**
   * Revoke a token
   */
  revokeToken(token: string): boolean {
    const deleted = this.tokens.delete(token);
    if (deleted) {
      this.saveTokens();
    }
    return deleted;
  }

  /**
   * List all tokens (for management)
   * Note: Does not return full token values for security
   */
  listTokens(): Array<{
    tokenHash: string;
    createdAt: string;
    expiresAt: string;
    scope: string[];
    clientName?: string;
    lastUsed?: string;
  }> {
    return Array.from(this.tokens.values()).map(t => ({
      tokenHash: t.token.substring(0, 8) + '...',
      createdAt: t.createdAt.toISOString(),
      expiresAt: t.expiresAt.toISOString(),
      scope: t.scope,
      clientName: t.clientName,
      lastUsed: t.lastUsed?.toISOString(),
    }));
  }

  /**
   * Validate MCP request
   */
  validateRequest(request: MCPRequest, allowedMethods?: string[]): {
    valid: boolean;
    error?: string;
  } {
    // Validate token
    const tokenCheck = this.validateToken(request.token);
    if (!tokenCheck.valid) {
      return { valid: false, error: tokenCheck.error };
    }

    // Validate method against allowed methods
    if (allowedMethods && !allowedMethods.includes(request.method)) {
      return { valid: false, error: `Method '${request.method}' not allowed` };
    }

    // method must be alphanumeric with underscores/hyphens
    if (!/^[a-z0-9_-]+$/.test(request.method)) {
      return { valid: false, error: 'Invalid method name' };
    }

    return { valid: true };
  }

  /**
   * Clean up expired tokens
   */
  cleanup(): number {
    const before = this.tokens.size;
    const now = new Date();

    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
      }
    }

    if (this.tokens.size !== before) {
      this.saveTokens();
    }

    return before - this.tokens.size;
  }

  private loadTokens(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.tokenFile)) {
        const data = JSON.parse(fs.readFileSync(this.tokenFile, 'utf-8'));
        this.tokens.clear();
        for (const [key, value] of Object.entries(data)) {
          const token = value as Record<string, unknown>;
          this.tokens.set(key, {
            token: key,
            createdAt: new Date(token.createdAt as string),
            expiresAt: new Date(token.expiresAt as string),
            scope: (token.scope as string[]) || [],
            clientName: token.clientName as string | undefined,
            lastUsed: token.lastUsed ? new Date(token.lastUsed as string) : undefined,
          });
        }
      }
    } catch (error) {
      // If file doesn't exist or is invalid, start fresh
      this.tokens.clear();
    }
  }

  private saveTokens(): void {
    try {
      const fs = require('fs');
      const path = require('path');

      const dir = path.dirname(this.tokenFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: Record<string, unknown> = {};
      for (const [key, value] of this.tokens.entries()) {
        data[key] = {
          createdAt: value.createdAt.toISOString(),
          expiresAt: value.expiresAt.toISOString(),
          scope: value.scope,
          clientName: value.clientName,
          lastUsed: value.lastUsed?.toISOString(),
        };
      }

      fs.writeFileSync(this.tokenFile, JSON.stringify(data, null, 2));
      // Set restrictive permissions (owner read/write only)
      fs.chmodSync(this.tokenFile, 0o600);
    } catch (error) {
      console.error('Failed to save MCP tokens:', error);
    }
  }
}

/**
 * Middleware for validating MCP requests
 */
export function createMCPAuthMiddleware(authManager: MCPAuthManager) {
  return (request: MCPRequest, allowedMethods?: string[]) => {
    const validation = authManager.validateRequest(request, allowedMethods);
    if (!validation.valid) {
      throw new Error(`MCP auth failed: ${validation.error}`);
    }
  };
}

/**
 * Create authorization header for MCP requests
 */
export function createMCPAuthHeader(token: string): {
  Authorization: string;
} {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Parse authorization header
 */
export function parseMCPAuthHeader(header?: string): {
  valid: boolean;
  token?: string;
  error?: string;
} {
  if (!header) {
    return { valid: false, error: 'Missing authorization header' };
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { valid: false, error: 'Invalid authorization header format' };
  }

  const token = parts[1];
  if (!token || token.length === 0) {
    return { valid: false, error: 'Empty token' };
  }

  return { valid: true, token };
}
