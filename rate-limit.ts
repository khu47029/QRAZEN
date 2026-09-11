/**
 * In-memory / Redis-ready Token Bucket & Lockout Rate Limiter.
 * Tracks password attempts, QR creation, and uploads per IP / identifier.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  locked?: boolean;
}

/**
 * Checks rate limit for an action.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetSeconds: windowSeconds,
    };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    const lockedSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: lockedSeconds,
      locked: true,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

/**
 * Records a failed password attempt and triggers progressive lockout.
 * After 5 failed attempts -> 15-minute lockout.
 */
export function recordPasswordFailure(qrKey: string): { locked: boolean; waitMinutes?: number } {
  const now = Date.now();
  const key = `pwd_fail:${qrKey}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + 3600 * 1000 };

  record.count += 1;

  if (record.count >= 5) {
    const lockoutMs = 15 * 60 * 1000; // 15 minutes lockout
    record.lockedUntil = now + lockoutMs;
    rateLimitStore.set(key, record);
    return { locked: true, waitMinutes: 15 };
  }

  rateLimitStore.set(key, record);
  return { locked: false };
}

/**
 * Resets password attempt counter upon successful login.
 */
export function resetPasswordFailures(qrKey: string): void {
  rateLimitStore.delete(`pwd_fail:${qrKey}`);
}

/**
 * Checks if a specific QR / IP is currently locked out.
 */
export function isPasswordLocked(qrKey: string): { locked: boolean; remainingSeconds?: number } {
  const key = `pwd_fail:${qrKey}`;
  const record = rateLimitStore.get(key);
  if (!record || !record.lockedUntil) return { locked: false };

  const now = Date.now();
  if (now < record.lockedUntil) {
    return {
      locked: true,
      remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  // Lock expired, reset record
  rateLimitStore.delete(key);
  return { locked: false };
}
