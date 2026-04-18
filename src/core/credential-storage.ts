/**
 * Local Credential Storage
 * Matches Claude Code's approach: macOS Keychain, encrypted JSON on Linux/Windows
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

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
  private encryptionKeyFile: string;

  constructor() {
    this.configDir = process.env.GITPULSE_CONFIG_DIR || path.join(os.homedir(), '.gitpulse');
    this.credentialFile = path.join(this.configDir, '.credentials.enc'); // Changed to .enc extension
    this.encryptionKeyFile = path.join(this.configDir, '.key');
    this.ensureConfigDir();
  }

  /**
   * Derive or load encryption key using scrypt
   * Key is derived from machine-specific data for binding to this device
   */
  private getEncryptionKey(): Buffer {
    // Use machine-specific data as salt (username, hostname, machine ID if available)
    const salt = scryptSync(
      os.userInfo().username + os.hostname(),
      'gitpulse-credentials-v1',
      32
    );
    
    // Derive a 256-bit key using scrypt
    return scryptSync(
      os.homedir(), // Use homedir as base secret (machine-specific)
      salt,
      32
    );
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
    // Security: Encrypt credentials using AES-256-GCM
    const key = this.getEncryptionKey();
    const iv = randomBytes(16); // 128-bit IV
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    const jsonData = JSON.stringify(data);
    const encrypted = Buffer.concat([
      cipher.update(jsonData, 'utf-8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag(); // 128-bit authentication tag
    
    // Store: IV (16 bytes) + Auth Tag (16 bytes) + Encrypted Data
    const output = Buffer.concat([iv, authTag, encrypted]);
    
    fs.writeFileSync(this.credentialFile, output);
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
      // Try legacy unencrypted file and migrate if exists
      const legacyFile = path.join(this.configDir, '.credentials.json');
      if (fs.existsSync(legacyFile)) {
        try {
          const content = fs.readFileSync(legacyFile, 'utf-8');
          const data: CredentialData = JSON.parse(content);
          // Migrate to encrypted format
          await this.saveToFile(data);
          // Delete legacy file
          fs.unlinkSync(legacyFile);
          return data.tokens;
        } catch {
          return null;
        }
      }
      return null;
    }

    try {
      const encrypted = fs.readFileSync(this.credentialFile);
      
      // Extract components: IV (16 bytes) + Auth Tag (16 bytes) + Encrypted Data
      const iv = encrypted.slice(0, 16);
      const authTag = encrypted.slice(16, 32);
      const ciphertext = encrypted.slice(32);
      
      // Decrypt using AES-256-GCM
      const key = this.getEncryptionKey();
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);
      
      const data: CredentialData = JSON.parse(decrypted.toString('utf-8'));
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
