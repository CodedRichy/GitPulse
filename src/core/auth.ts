/**
 * Authentication and Token Management
 * Matches Claude Code's approach: local credential storage, browser OAuth
 */

import { CredentialStorage, TokenData } from './credential-storage.js';
import open from 'open';
import { randomBytes, createHash } from 'crypto';
import { createServer } from 'http';

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

const OAUTH_PROVIDERS: Record<string, OAuthConfig> = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'repo'],
  },
  gitlab: {
    clientId: process.env.GITLAB_CLIENT_ID || '',
    clientSecret: process.env.GITLAB_CLIENT_SECRET,
    authUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    scopes: ['read_user', 'read_repository'],
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['openid', 'profile', 'email'],
  },
};

/**
 * Account service using local credential storage (matches Claude Code)
 */
export class AccountService {
  private credentialStorage: CredentialStorage;
  private currentTokens: TokenData | null = null;

  constructor() {
    this.credentialStorage = new CredentialStorage();
  }

  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.credentialStorage.loadTokens();
    if (!tokens) {
      return false;
    }
    
    if (!this.credentialStorage.isTokenValid(tokens)) {
      return false;
    }
    
    this.currentTokens = tokens;
    return true;
  }

  async loginWithOAuth(provider: 'github' | 'gitlab' | 'google'): Promise<void> {
    const config = OAUTH_PROVIDERS[provider];
    
    if (!config.clientId) {
      throw new Error(`${provider} OAuth not configured. Set ${provider.toUpperCase()}_CLIENT_ID environment variable.`);
    }

    // Generate state parameter for security
    const state = randomBytes(16).toString('hex');
    
    // Security: Generate PKCE parameters to prevent authorization code interception
    const codeVerifier = this.generatePKCEVerifier();
    const codeChallenge = this.generatePKCEChallenge(codeVerifier);
    
    // Build authorization URL with PKCE
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: 'http://localhost:3000/auth/callback',
      scope: config.scopes.join(' '),
      state,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;
    
    // Start a local server to handle the callback
    // Security: Rate limiting to prevent brute force attacks
    const requestTimestamps: number[] = [];
    const RATE_LIMIT_WINDOW = 60000; // 1 minute
    const RATE_LIMIT_MAX = 10; // max 10 requests per minute
    
    const callbackPromise = new Promise<string>((resolve, reject) => {
      const server = createServer((req, res) => {
        const clientIp = req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        
        // Clean old timestamps
        while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
          requestTimestamps.shift();
        }
        
        // Security: Check rate limit
        if (requestTimestamps.length >= RATE_LIMIT_MAX) {
          res.writeHead(429, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Rate Limit Exceeded</h1><p>Too many requests. Please try again later.</p></body></html>');
          return;
        }
        
        requestTimestamps.push(now);
        
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        
        if (url.pathname === '/auth/callback') {
          const code = url.searchParams.get('code');
          const returnedState = url.searchParams.get('state');
          
          // Verify state parameter
          if (returnedState !== state) {
            res.writeHead(400);
            res.end('Invalid state parameter');
            reject(new Error('OAuth state mismatch'));
            server.close();
            return;
          }
          
          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>');
            resolve(code);
            server.close();
          } else {
            const error = url.searchParams.get('error');
            res.writeHead(400);
            res.end(`Authentication failed: ${error || 'Unknown error'}`);
            reject(new Error(error || 'OAuth callback failed'));
            server.close();
          }
        }
      });
      
      server.listen(3000, () => {
        console.log('OAuth callback server listening on port 3000');
      });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('OAuth callback timeout'));
      }, 5 * 60 * 1000);
    });
    
    // Open browser for OAuth flow (matches Claude Code)
    console.log('Opening browser for OAuth authentication...');
    console.log(`If browser doesn't open, visit: ${authUrl}`);
    await open(authUrl);
    
    try {
      const code = await callbackPromise;
      
      // Exchange authorization code for tokens
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: 'http://localhost:3000/auth/callback',
          code_verifier: codeVerifier, // Security: PKCE code verifier
        }),
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
      }
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      if (!accessToken) {
        throw new Error('No access token received');
      }
      
      // Store tokens
      await this.loginWithToken(accessToken, provider);
      console.log('Authentication successful!');
    } catch (error) {
      throw new Error(`OAuth authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async loginWithToken(accessToken: string, provider: string, userId?: string, email?: string): Promise<void> {
    const tokens: TokenData = {
      accessToken,
      refreshToken: '',
      expiresAt: Date.now() + (3600 * 1000), // 1 hour default
      userId: userId || 'user-' + randomBytes(8).toString('hex'),
      email,
      provider,
    };

    await this.credentialStorage.saveTokens(tokens);
    this.currentTokens = tokens;
  }

  async logout(): Promise<void> {
    await this.credentialStorage.clearTokens();
    this.currentTokens = null;
  }

  async getTokens(): Promise<TokenData | null> {
    if (this.currentTokens) {
      return this.currentTokens;
    }
    
    const tokens = await this.credentialStorage.loadTokens();
    if (tokens && this.credentialStorage.isTokenValid(tokens)) {
      this.currentTokens = tokens;
      return tokens;
    }
    
    return null;
  }

  async ensureValidTokens(): Promise<TokenData | null> {
    const tokens = await this.getTokens();
    if (!tokens) {
      return null;
    }

    if (this.credentialStorage.needsRefresh(tokens)) {
      // Token refresh would be implemented here
      // For now, just return the tokens
      return tokens;
    }

    return tokens;
  }

  getConfigDir(): string {
    return this.credentialStorage.getConfigDir();
  }

  /**
   * Generate PKCE code verifier (43-128 characters of [A-Za-z0-9-._~])
   */
  private generatePKCEVerifier(): string {
    const length = 128;
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let verifier = '';
    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      verifier += possible.charAt(bytes[i] % possible.length);
    }
    return verifier;
  }

  /**
   * Generate PKCE code challenge from verifier (Base64URL-encoded SHA256 hash)
   */
  private generatePKCEChallenge(verifier: string): string {
    return createHash('sha256')
      .update(verifier)
      .digest()
      .toString('base64url');
  }
}
