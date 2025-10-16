import crypto from 'crypto';
import { storage } from './storage';
import { chromium } from 'playwright-core';

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

interface CookieValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

function validateAndNormalizeCookies(rawCookies: string): CookieValidationResult {
  if (!rawCookies || typeof rawCookies !== 'string') {
    return {
      isValid: false,
      error: 'Cookie string is required and must be a string'
    };
  }

  let cookies = rawCookies.trim();

  if (cookies.length === 0) {
    return {
      isValid: false,
      error: 'Cookie string cannot be empty'
    };
  }

  if (cookies.includes('\n') || cookies.includes('\r')) {
    return {
      isValid: false,
      error: 'Invalid cookie format: cookies cannot contain newlines. Please provide cookies as a single line in the format: cookie_name=value; cookie_name2=value2'
    };
  }

  if (cookies.toLowerCase().startsWith('cookie:')) {
    cookies = cookies.substring(7).trim();
  }

  const cookiePairs = cookies.split(';').map(pair => pair.trim()).filter(pair => pair.length > 0);

  if (cookiePairs.length === 0) {
    return {
      isValid: false,
      error: 'Invalid cookie format: no valid cookie pairs found. Expected format: cookie_name=value; cookie_name2=value2'
    };
  }

  for (const pair of cookiePairs) {
    if (!pair.includes('=')) {
      return {
        isValid: false,
        error: `Invalid cookie format: "${pair}" does not contain "=". Each cookie must be in the format: cookie_name=value`
      };
    }

    const [name, ...valueParts] = pair.split('=');
    const cookieName = name.trim();
    const cookieValue = valueParts.join('=').trim();

    if (cookieName.length === 0) {
      return {
        isValid: false,
        error: `Invalid cookie format: cookie name cannot be empty. Expected format: cookie_name=value; cookie_name2=value2`
      };
    }

    if (/[^\x20-\x7E]/.test(pair)) {
      return {
        isValid: false,
        error: 'Invalid cookie format: cookies contain non-printable or invalid characters'
      };
    }
  }

  const normalizedCookies = cookiePairs.join('; ');

  const requiredCookieNames = ['pl_profile', 'sessionid', 'csrftoken'];
  const cookieNames = cookiePairs.map(pair => pair.split('=')[0].trim().toLowerCase());
  const hasRequiredCookie = requiredCookieNames.some(required => 
    cookieNames.includes(required.toLowerCase())
  );

  if (!hasRequiredCookie) {
    return {
      isValid: false,
      error: `Invalid cookies: missing required FPL session cookies. Expected at least one of: ${requiredCookieNames.join(', ')}. Please ensure you copied the complete cookie string from your browser.`
    };
  }

  return {
    isValid: true,
    normalized: normalizedCookies
  };
}

class FPLAuthService {
  async login(email: string, password: string, userId: number): Promise<void> {
    console.log(`[FPL Auth] Attempting login for user ${userId} using browser automation`);
    
    let browser;
    
    try {
      // Launch headless browser to bypass Cloudflare
      console.log(`[FPL Auth] Launching headless browser...`);
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-GB',
      });

      const page = await context.newPage();

      // Navigate to login page
      console.log(`[FPL Auth] Navigating to login page...`);
      await page.goto(FPL_LOGIN_URL, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for login form to be visible
      console.log(`[FPL Auth] Waiting for login form...`);
      await page.waitForSelector('input[name="login"], input[type="email"]', { timeout: 10000 });

      // Fill in credentials
      console.log(`[FPL Auth] Filling in credentials...`);
      const emailInput = await page.$('input[name="login"], input[type="email"]');
      const passwordInput = await page.$('input[name="password"], input[type="password"]');

      if (!emailInput || !passwordInput) {
        throw new Error('Could not find login form fields');
      }

      await emailInput.fill(email);
      await passwordInput.fill(password);

      // Small delay to mimic human behavior
      await page.waitForTimeout(500);

      // Submit the form
      console.log(`[FPL Auth] Submitting login form...`);
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');
      
      if (submitButton) {
        await submitButton.click();
      } else {
        // Fallback: submit the form directly
        await page.keyboard.press('Enter');
      }

      // Wait for navigation or error
      console.log(`[FPL Auth] Waiting for login response...`);
      try {
        await Promise.race([
          page.waitForURL('**/fantasy.premierleague.com/**', { timeout: 15000 }),
          page.waitForURL('**/a/login**', { timeout: 15000 }),
        ]);
      } catch (e) {
        // Check if we're on an error page
        const currentUrl = page.url();
        if (currentUrl.includes('holding.html')) {
          throw new Error('FPL authentication temporarily unavailable due to security measures. Please try again in a few minutes.');
        }
        
        // Check for error messages on the page
        const errorText = await page.textContent('.error, .alert, [role="alert"]').catch(() => null);
        if (errorText) {
          throw new Error(`Login failed: ${errorText}`);
        }
      }

      // Check final URL
      const finalUrl = page.url();
      console.log(`[FPL Auth] Final URL: ${finalUrl}`);

      if (finalUrl.includes('holding.html')) {
        throw new Error('FPL authentication temporarily unavailable due to security measures. Please try again in a few minutes.');
      }

      // Extract cookies from browser context
      const cookies = await context.cookies();
      console.log(`[FPL Auth] Extracted ${cookies.length} cookies from browser`);

      if (cookies.length === 0) {
        throw new Error('Login failed: Invalid email or password. Please check your FPL credentials.');
      }

      // Convert cookies to string format
      const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
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
    } finally {
      // Always close the browser
      if (browser) {
        await browser.close();
        console.log(`[FPL Auth] Browser closed`);
      }
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

  extractCsrfToken(cookies: string): string | null {
    // FPL uses "Csrf" (capital C) in Safari/Chrome, "csrftoken" in some other browsers
    const csrfMatch = cookies.match(/(?:Csrf|csrftoken)=([^;]+)/i);
    return csrfMatch ? csrfMatch[1] : null;
  }

  async getCsrfToken(userId: number): Promise<string> {
    const cookies = await this.getSessionCookies(userId);
    const token = this.extractCsrfToken(cookies);
    
    if (!token) {
      throw new Error('CSRF token not found in session cookies');
    }
    
    return token;
  }

  async refreshSession(userId: number): Promise<void> {
    console.log(`[FPL Auth] Refreshing session for user ${userId}`);
    
    const credentials = await storage.getFplCredentials(userId);
    
    if (!credentials) {
      throw new Error(`No FPL credentials found for user ${userId}. Please login first.`);
    }

    // Check if we have stored email/password for refresh
    if (!credentials.emailEncrypted || !credentials.passwordEncrypted) {
      throw new Error('Session expired. Cannot auto-refresh without stored credentials. Please re-authenticate with cookies or email/password.');
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

  async loginWithCookies(userId: number, cookies: string, email?: string, password?: string): Promise<void> {
    console.log(`[FPL Auth] Manual cookie authentication for user ${userId}`);
    
    try {
      const validationResult = validateAndNormalizeCookies(cookies);
      
      if (!validationResult.isValid) {
        throw new Error(validationResult.error || 'Invalid cookie format');
      }

      const normalizedCookies = validationResult.normalized!;
      console.log(`[FPL Auth] Cookie validation passed, testing authentication...`);

      const testResponse = await fetch('https://fantasy.premierleague.com/api/me/', {
        headers: {
          'Cookie': normalizedCookies,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      });

      if (!testResponse.ok) {
        if (testResponse.status === 403) {
          throw new Error('Authentication failed: The provided cookies are invalid or expired. Please log in to FPL in your browser and copy fresh cookies.');
        } else if (testResponse.status === 401) {
          throw new Error('Authentication failed: The provided cookies are not authorized. Please ensure you copied the complete cookie string from an active FPL session.');
        } else {
          throw new Error(`Authentication failed: FPL API returned status ${testResponse.status}. Please ensure your cookies are current and valid.`);
        }
      }

      const userData = await testResponse.json();
      console.log(`[FPL Auth] Cookie validation successful for user ${userId}, FPL ID: ${userData.player}`);

      const cookiesExpiresAt = new Date();
      cookiesExpiresAt.setDate(cookiesExpiresAt.getDate() + COOKIE_EXPIRY_DAYS);

      await storage.saveFplCredentials({
        userId,
        emailEncrypted: email ? encrypt(email) : null,
        passwordEncrypted: password ? encrypt(password) : null,
        sessionCookies: normalizedCookies,
        cookiesExpiresAt,
      });

      console.log(`[FPL Auth] ✓ Manual authentication successful for user ${userId}, session expires ${cookiesExpiresAt.toISOString()}`);
    } catch (error) {
      console.error(`[FPL Auth] ✗ Manual authentication error for user ${userId}:`, error);
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
