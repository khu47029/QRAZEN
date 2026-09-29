import { db } from "@/db";
import { passwordAttempts, authAttempts } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { generateId } from "./crypto";

/**
 * Token Bucket & Lockout Rate Limiter with In-Memory Optimization and Postgres Persistence.
 * Tracks authentication attempts, QR creation, and uploads per IP / identifier.
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
 * Checks in-memory rate limit for an action (fast-tier).
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

/**
 * Persistent QR viewer password verification check across serverless instances.
 */
export async function checkPersistentQrLockout(
  qrCodeId: string,
  ipHash: string
): Promise<{ locked: boolean; remainingSeconds?: number }> {
  // First check fast in-memory tier
  const memCheck = isPasswordLocked(`${qrCodeId}:${ipHash}`);
  if (memCheck.locked) return memCheck;

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const attempts = await db
      .select()
      .from(passwordAttempts)
      .where(
        and(
          eq(passwordAttempts.qrCodeId, qrCodeId),
          eq(passwordAttempts.ipHash, ipHash),
          eq(passwordAttempts.success, false),
          gte(passwordAttempts.attemptedAt, fifteenMinutesAgo)
        )
      )
      .orderBy(desc(passwordAttempts.attemptedAt));

    if (attempts.length >= 5) {
      const mostRecent = attempts[0]?.attemptedAt;
      if (mostRecent) {
        const lockExpiry = new Date(mostRecent).getTime() + 15 * 60 * 1000;
        const remaining = Math.ceil((lockExpiry - Date.now()) / 1000);
        if (remaining > 0) {
          return { locked: true, remainingSeconds: remaining };
        }
      }
    }
  } catch {
    // Fall back to in-memory check if DB fails
  }

  return { locked: false };
}

/**
 * Records an attempt persistently in the database for QR viewer protection.
 */
export async function recordPersistentQrAttempt(
  qrCodeId: string,
  ipHash: string,
  success: boolean
): Promise<void> {
  try {
    await db.insert(passwordAttempts).values({
      id: generateId(),
      qrCodeId,
      ipHash,
      success,
    });
  } catch (err) {
    console.error("recordPersistentQrAttempt error:", err);
  }
}

/**
 * Persistent distributed rate limiting and brute-force protection for login/signup across serverless instances.
 */
export async function checkPersistentAuthRateLimit(
  target: "login" | "signup",
  ipHash: string,
  maxAttempts = 10,
  windowMinutes = 15
): Promise<{ allowed: boolean; remaining: number; waitMinutes?: number }> {
  // Check fast in-memory tier first
  const mem = checkRateLimit(`auth_${target}:${ipHash}`, maxAttempts, windowMinutes * 60);
  if (!mem.allowed) {
    return {
      allowed: false,
      remaining: 0,
      waitMinutes: Math.max(1, Math.ceil(mem.resetSeconds / 60)),
    };
  }

  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const rows = await db
      .select({ id: authAttempts.id, attemptedAt: authAttempts.attemptedAt })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.target, target),
          eq(authAttempts.ipHash, ipHash),
          eq(authAttempts.success, false),
          gte(authAttempts.attemptedAt, windowStart)
        )
      )
      .orderBy(desc(authAttempts.attemptedAt));

    if (rows.length >= maxAttempts) {
      const oldestInWindow = rows[rows.length - 1];
      const expiry = new Date(oldestInWindow.attemptedAt).getTime() + windowMinutes * 60 * 1000;
      const waitMinutes = Math.max(1, Math.ceil((expiry - Date.now()) / 60000));
      return { allowed: false, remaining: 0, waitMinutes };
    }

    return { allowed: true, remaining: maxAttempts - rows.length };
  } catch {
    // If DB is unavailable, fail open to in-memory tier rather than crashing
    return { allowed: mem.allowed, remaining: mem.remaining };
  }
}

/**
 * Records an authentication attempt (success or failure) in the database for distributed rate limiting.
 */
export async function recordPersistentAuthAttempt(
  target: "login" | "signup",
  ipHash: string,
  success: boolean
): Promise<void> {
  try {
    await db.insert(authAttempts).values({
      id: generateId(),
      target,
      ipHash,
      success,
    });
  } catch (err) {
    console.error("recordPersistentAuthAttempt error:", err);
  }
}
