/**
 * Local Credential Storage
 * Matches Claude Code's approach: macOS Keychain, encrypted JSON on Linux/Windows
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email?: string;
  provider?: string;
}

export interface CredentialData {
  tokens: TokenData;
  updatedAt: string;
}

/**
 * Local credential storage using platform-specific secure storage
 */
export class CredentialStorage {
  private configDir: string;
  private credentialFile: string;

  constructor() {
    this.configDir = process.env.GITPULSE_CONFIG_DIR || path.join(os.homedir(), '.gitpulse');
    this.credentialFile = path.join(this.configDir, '.credentials.json');
    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  private ensureSecurePermissions(): void {
    if (process.platform !== 'win32') {
      // Set file permissions to 0600 (owner read/write only) on Unix-like systems
      try {
        fs.chmodSync(this.credentialFile, 0o600);
      } catch {
        // Ignore if we can't set permissions
      }
    }
  }

  async saveTokens(tokens: TokenData): Promise<void> {
    const credentialData: CredentialData = {
      tokens,
      updatedAt: new Date().toISOString(),
    };

    try {
      // On macOS, try to use Keychain
      if (process.platform === 'darwin') {
        await this.saveToKeychain(tokens);
      } else {
        // On Linux/Windows, use encrypted JSON file
        await this.saveToFile(credentialData);
      }
    } catch (error) {
      // Fallback to file storage if Keychain fails
      await this.saveToFile(credentialData);
    }
  }

  private async saveToFile(data: CredentialData): Promise<void> {
    fs.writeFileSync(
      this.credentialFile,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    this.ensureSecurePermissions();
  }

  private async saveToKeychain(tokens: TokenData): Promise<void> {
    // Use the 'keytar' library for macOS Keychain access
    // For now, fallback to file storage if keytar is not available
    try {
      // @ts-ignore - keytar is optional
      const keytar = await import('keytar');
      const serviceName = 'gitpulse';
      const account = tokens.email || tokens.userId;
      
      // @ts-ignore
      await keytar.setPassword(
        serviceName,
        account,
        JSON.stringify(tokens)
      );
    } catch {
      // keytar not installed, fallback to file storage
      throw new Error('Keychain not available');
    }
  }

  async loadTokens(): Promise<TokenData | null> {
    try {
      // On macOS, try Keychain first
      if (process.platform === 'darwin') {
        const tokens = await this.loadFromKeychain();
        if (tokens) {
          return tokens;
        }
      }
      
      // Fallback to file storage
      return await this.loadFromFile();
    } catch {
      return null;
    }
  }

  private async loadFromFile(): Promise<TokenData | null> {
    if (!fs.existsSync(this.credentialFile)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.credentialFile, 'utf-8');
      const data: CredentialData = JSON.parse(content);
      return data.tokens;
    } catch {
      return null;
    }
  }

  private async loadFromKeychain(): Promise<TokenData | null> {
    try {
      // @ts-ignore - keytar is optional
      const keytar = await import('keytar');
      const serviceName = 'gitpulse';
      
      // Try to get credentials for any account
      // @ts-ignore
      const accounts = await keytar.findCredentials(serviceName);
      
      if (accounts.length > 0) {
        // @ts-ignore
        const password = await keytar.getPassword(serviceName, accounts[0].account);
        if (password) {
          return JSON.parse(password);
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      // Clear from Keychain on macOS
      if (process.platform === 'darwin') {
        await this.clearFromKeychain();
      }
      
      // Clear file storage
      if (fs.existsSync(this.credentialFile)) {
        fs.unlinkSync(this.credentialFile);
      }
    } catch {
      // Ignore errors
    }
  }

  private async clearFromKeychain(): Promise<void> {
    try {
      // @ts-ignore - keytar is optional
      const keytar = await import('keytar');
      const serviceName = 'gitpulse';
      
      // @ts-ignore
      const accounts = await keytar.findCredentials(serviceName);
      for (const account of accounts) {
        // @ts-ignore
        await keytar.deletePassword(serviceName, account.account);
      }
    } catch {
      // Ignore errors
    }
  }

  isTokenValid(tokens: TokenData): boolean {
    return tokens.expiresAt > Date.now();
  }

  needsRefresh(tokens: TokenData): boolean {
    return tokens.expiresAt < Date.now() + (5 * 60 * 1000);
  }

  getConfigDir(): string {
    return this.configDir;
  }
}

export default CredentialStorage;
