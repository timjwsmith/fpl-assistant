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
    throw new Error(
      `FPL_ENCRYPTION_KEY environment variable is required but not set.\n\n` +
      `To fix this, add the following to your Secrets:\n` +
      `FPL_ENCRYPTION_KEY=${generatedKey}\n\n` +
      `Without this key, encrypted credentials cannot be persisted across restarts.`
    );
  }
  
  if (secretKey.length !== 64) {
    throw new Error('FPL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
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
      // Step 1: Visit the main FPL page to establish session and bypass Cloudflare
      console.log(`[FPL Auth] Establishing session with FPL...`);
      const mainPageResponse = await fetch('https://fantasy.premierleague.com/', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const mainPageCookies = mainPageResponse.headers.getSetCookie?.() || [];
      console.log(`[FPL Auth] Main page cookies: ${mainPageCookies.length}`);

      // Small delay to mimic human behavior
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Get the login page to extract CSRF tokens
      console.log(`[FPL Auth] Fetching login page...`);
      const loginPageResponse = await fetch(FPL_LOGIN_URL, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-site',
          'Sec-Fetch-User': '?1',
          'Referer': 'https://fantasy.premierleague.com/',
        },
      });

      const csrfCookies = loginPageResponse.headers.getSetCookie?.() || [];
      const loginPageHtml = await loginPageResponse.text();
      
      // Extract CSRF token from HTML if present
      const csrfTokenMatch = loginPageHtml.match(/name=['"]csrfmiddlewaretoken['"] value=['"]([^'"]+)['"]/);
      const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : null;
      
      console.log(`[FPL Auth] CSRF token found: ${csrfToken ? 'Yes' : 'No'}`);
      console.log(`[FPL Auth] Login page cookies: ${csrfCookies.length}`);

      // Combine all cookies
      const allCookies = [...mainPageCookies, ...csrfCookies];
      const cookieHeader = allCookies
        .map(cookie => cookie.split(';')[0])
        .join('; ');

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Attempt login with full browser headers
      const formData = new URLSearchParams({
        login: email,
        password: password,
        redirect_uri: 'https://fantasy.premierleague.com/a/login',
        app: 'plfpl-web',
      });

      if (csrfToken) {
        formData.append('csrfmiddlewaretoken', csrfToken);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Referer': 'https://users.premierleague.com/accounts/login/',
        'Origin': 'https://users.premierleague.com',
        'Upgrade-Insecure-Requests': '1',
      };

      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      const response = await fetch(FPL_LOGIN_URL, {
        method: 'POST',
        headers,
        body: formData.toString(),
        redirect: 'manual',
      });

      console.log(`[FPL Auth] Response status: ${response.status} ${response.statusText}`);
      const redirectLocation = response.headers.get('location') || '';
      console.log(`[FPL Auth] Redirect location: ${redirectLocation}`);
      
      const responseText = await response.text();
      console.log(`[FPL Auth] Response body preview: ${responseText.substring(0, 200)}`);

      // Check if redirected to holding page (Cloudflare block)
      if (redirectLocation.includes('holding.html')) {
        console.error(`[FPL Auth] Cloudflare bot protection detected`);
        throw new Error('FPL authentication temporarily unavailable due to security measures. Please try again in a few minutes.');
      }

      // Check for redirect (successful login)
      if (response.status === 302 || response.status === 303 || response.status === 307) {
        console.log(`[FPL Auth] Login successful - got redirect to ${redirectLocation}`);
      } else if (!response.ok) {
        console.error(`[FPL Auth] Login failed for user ${userId}: ${response.status} ${response.statusText}`);
        throw new Error(`FPL login failed: ${response.statusText}`);
      }

      const setCookieHeaders = response.headers.getSetCookie?.() || response.headers.get('set-cookie')?.split(',') || [];
      
      console.log(`[FPL Auth] Set-Cookie headers count: ${setCookieHeaders.length}`);
      
      if (setCookieHeaders.length === 0) {
        console.error(`[FPL Auth] No cookies received for user ${userId}`);
        throw new Error('Login failed: Invalid email or password. Please check your FPL credentials.');
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

      const formData = new URLSearchParams({
        login: email,
        password: password,
        redirect_uri: 'https://fantasy.premierleague.com/a/login',
        app: 'plfpl-web',
      });

      const response = await fetch(FPL_LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://fantasy.premierleague.com/',
          'Origin': 'https://fantasy.premierleague.com',
        },
        body: formData.toString(),
      });

      console.log(`[FPL Auth Refresh] Response status: ${response.status} ${response.statusText}`);
      const responseText = await response.text();

      if (!response.ok) {
        console.error(`[FPL Auth] Session refresh failed for user ${userId}: ${response.status}`);
        throw new Error(`FPL session refresh failed: ${response.statusText} - ${responseText.substring(0, 500)}`);
      }

      const setCookieHeaders = response.headers.getSetCookie?.() || response.headers.get('set-cookie')?.split(',') || [];
      
      console.log(`[FPL Auth Refresh] Set-Cookie headers count: ${setCookieHeaders.length}`);
      
      if (setCookieHeaders.length === 0) {
        console.error(`[FPL Auth Refresh] Response body: ${responseText.substring(0, 1000)}`);
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
