/**
 * Security utilities for Qualee
 * Includes rate limiting and request validation
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (for single-instance deployments)
// For production with multiple instances, use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean every minute
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param limit - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  let entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: limit - 1,
      resetIn: windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // API endpoints
  API_DEFAULT: { limit: 100, windowMs: 60000 },     // 100 req/min
  API_AUTH: { limit: 10, windowMs: 60000 },          // 10 req/min for auth
  API_SPIN: { limit: 5, windowMs: 60000 },           // 5 spins/min
  API_FEEDBACK: { limit: 10, windowMs: 60000 },      // 10 feedback/min

  // Sensitive operations
  LOGIN: { limit: 5, windowMs: 300000 },             // 5 attempts per 5 min
  SIGNUP: { limit: 3, windowMs: 600000 },            // 3 signups per 10 min
  PASSWORD_RESET: { limit: 3, windowMs: 600000 },    // 3 resets per 10 min
} as const;

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Check various headers for the real IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

/**
 * Validate Origin header for CSRF protection
 */
export function validateOrigin(
  requestOrigin: string | null,
  allowedOrigin: string
): boolean {
  if (!requestOrigin) return false;

  try {
    const requestUrl = new URL(requestOrigin);
    const allowedUrl = new URL(allowedOrigin);
    return requestUrl.host === allowedUrl.host;
  } catch {
    return false;
  }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

/**
 * Hash a string (for non-sensitive comparisons)
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
