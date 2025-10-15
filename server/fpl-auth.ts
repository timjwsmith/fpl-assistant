import crypto from 'crypto';
import { storage } from './storage';

const FPL_LOGIN_URL = 'https://users.premierleague.com/accounts/login/';
const COOKIE_EXPIRY_DAYS = 7;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

function getEncryptionKey(): Buffer {
  const secretKey = process.env.FPL_ENCRYPTION_KEY;
  
  if (!secretKey) {
    const generatedKey = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  FPL_ENCRYPTION_KEY not found in environment. Generated temporary key (not persistent across restarts).');
    console.warn(`   To persist credentials, add this to your environment: FPL_ENCRYPTION_KEY=${generatedKey}`);
    return Buffer.from(generatedKey, 'hex');
  }
  
  if (secretKey.length !== 64) {
    throw new Error('FPL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  return Buffer.from(secretKey, 'hex');
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

interface LoginResponse {
  success: boolean;
  cookies?: string[];
  error?: string;
}

class FPLAuthService {
  async login(email: string, password: string, userId: number): Promise<void> {
    console.log(`[FPL Auth] Attempting login for user ${userId}`);
    
    try {
      const response = await fetch(FPL_LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          login: email,
          password: password,
          redirect_uri: 'https://fantasy.premierleague.com/a/login',
          app: 'plfpl-web',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FPL Auth] Login failed for user ${userId}: ${response.status} ${response.statusText}`);
        throw new Error(`FPL login failed: ${response.statusText} - ${errorText}`);
      }

      const setCookieHeaders = response.headers.getSetCookie?.() || response.headers.get('set-cookie')?.split(',') || [];
      
      if (setCookieHeaders.length === 0) {
        console.error(`[FPL Auth] No cookies received for user ${userId}`);
        throw new Error('Login failed: No session cookies received from FPL');
      }

      const cookieString = setCookieHeaders
        .map(cookie => cookie.split(';')[0])
        .join('; ');

      const emailEncrypted = encrypt(email);
      const passwordEncrypted = encrypt(password);
      const cookiesExpiresAt = new Date();
      cookiesExpiresAt.setDate(cookiesExpiresAt.getDate() + COOKIE_EXPIRY_DAYS);

      await storage.saveFplCredentials({
        userId,
        emailEncrypted,
        passwordEncrypted,
        sessionCookies: cookieString,
        cookiesExpiresAt,
      });

      console.log(`[FPL Auth] ✓ Login successful for user ${userId}, session expires ${cookiesExpiresAt.toISOString()}`);
    } catch (error) {
      console.error(`[FPL Auth] ✗ Login error for user ${userId}:`, error);
      throw error;
    }
  }

  async isAuthenticated(userId: number): Promise<boolean> {
    try {
      const credentials = await storage.getFplCredentials(userId);
      
      if (!credentials || !credentials.sessionCookies) {
        return false;
      }

      const now = new Date();
      const expiresAt = credentials.cookiesExpiresAt ? new Date(credentials.cookiesExpiresAt) : null;

      if (!expiresAt || expiresAt <= now) {
        console.log(`[FPL Auth] Session expired for user ${userId}, attempting refresh...`);
        try {
          await this.refreshSession(userId);
          return true;
        } catch (error) {
          console.error(`[FPL Auth] Failed to refresh session for user ${userId}:`, error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`[FPL Auth] Error checking authentication for user ${userId}:`, error);
      return false;
    }
  }

  async getSessionCookies(userId: number): Promise<string> {
    const credentials = await storage.getFplCredentials(userId);
    
    if (!credentials || !credentials.sessionCookies) {
      throw new Error(`No FPL credentials found for user ${userId}. Please login first.`);
    }

    const now = new Date();
    const expiresAt = credentials.cookiesExpiresAt ? new Date(credentials.cookiesExpiresAt) : null;

    if (!expiresAt || expiresAt <= now) {
      console.log(`[FPL Auth] Session expired for user ${userId}, refreshing...`);
      await this.refreshSession(userId);
      
      const refreshedCredentials = await storage.getFplCredentials(userId);
      if (!refreshedCredentials || !refreshedCredentials.sessionCookies) {
        throw new Error('Failed to refresh session cookies');
      }
      
      return refreshedCredentials.sessionCookies;
    }

    return credentials.sessionCookies;
  }

  async refreshSession(userId: number): Promise<void> {
    console.log(`[FPL Auth] Refreshing session for user ${userId}`);
    
    const credentials = await storage.getFplCredentials(userId);
    
    if (!credentials) {
      throw new Error(`No FPL credentials found for user ${userId}. Please login first.`);
    }

    try {
      const email = decrypt(credentials.emailEncrypted);
      const password = decrypt(credentials.passwordEncrypted);

      const response = await fetch(FPL_LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          login: email,
          password: password,
          redirect_uri: 'https://fantasy.premierleague.com/a/login',
          app: 'plfpl-web',
        }),
      });

      if (!response.ok) {
        console.error(`[FPL Auth] Session refresh failed for user ${userId}: ${response.status}`);
        throw new Error(`FPL session refresh failed: ${response.statusText}`);
      }

      const setCookieHeaders = response.headers.getSetCookie?.() || response.headers.get('set-cookie')?.split(',') || [];
      
      if (setCookieHeaders.length === 0) {
        throw new Error('Session refresh failed: No cookies received');
      }

      const cookieString = setCookieHeaders
        .map(cookie => cookie.split(';')[0])
        .join('; ');

      const cookiesExpiresAt = new Date();
      cookiesExpiresAt.setDate(cookiesExpiresAt.getDate() + COOKIE_EXPIRY_DAYS);

      await storage.updateFplCredentials(userId, {
        sessionCookies: cookieString,
        cookiesExpiresAt,
      });

      console.log(`[FPL Auth] ✓ Session refreshed for user ${userId}, expires ${cookiesExpiresAt.toISOString()}`);
    } catch (error) {
      console.error(`[FPL Auth] ✗ Session refresh error for user ${userId}:`, error);
      throw error;
    }
  }

  async logout(userId: number): Promise<void> {
    console.log(`[FPL Auth] Logging out user ${userId}`);
    
    const deleted = await storage.deleteFplCredentials(userId);
    
    if (deleted) {
      console.log(`[FPL Auth] ✓ Successfully logged out user ${userId}`);
    } else {
      console.log(`[FPL Auth] No credentials found for user ${userId}`);
    }
  }
}

export const fplAuth = new FPLAuthService();
