import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyViewerSessionToken } from "@/lib/security/crypto";
import type { User } from "@/db/schema";

import crypto from "crypto";
import { generateId } from "@/lib/security/crypto";
import { sessions } from "@/db/schema";
import { and, gt, lt } from "drizzle-orm";

const SESSION_COOKIE = "qr_session";
const VIEWER_COOKIE_PREFIX = "qr_viewer_";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Owner session ─────────────────────────────────────────────────────────────

/**
 * Computes a SHA-256 hash of the raw session token.
 * Only the hash is stored in the database to prevent session hijacking if the DB is compromised.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a new cryptographic session in the database and returns the raw token.
 */
export async function createSession(
  userId: string,
  options?: { userAgent?: string; ipHash?: string }
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await db.insert(sessions).values({
    id: generateId(),
    userId,
    tokenHash,
    expiresAt,
    userAgent: options?.userAgent?.slice(0, 500) ?? null,
    ipHash: options?.ipHash ?? null,
  });

  // Non-blocking cleanup of stale sessions
  cleanupExpiredSessions().catch(() => {});

  return rawToken;
}

/**
 * Validates a session token against the database and returns the User if valid and unexpired.
 */
export async function validateSessionToken(token: string): Promise<User | null> {
  // Session tokens are strictly 32 bytes hex (64 chars). Rejects legacy UUIDs and malformed tokens immediately.
  if (!token || typeof token !== "string" || !/^[0-9a-f]{64}$/i.test(token)) {
    return null;
  }

  try {
    const tokenHash = hashSessionToken(token);
    const nowIso = new Date().toISOString();

    const [row] = await db
      .select({
        user: users,
        session: sessions,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, nowIso)
        )
      );

    if (!row?.user) {
      return null;
    }

    return row.user;
  } catch (err) {
    console.error("validateSessionToken error:", err);
    return null;
  }
}

/**
 * Destroys a session in the database by raw token.
 */
export async function destroySession(token: string): Promise<void> {
  if (!token || typeof token !== "string") return;

  try {
    const tokenHash = hashSessionToken(token);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  } catch (err) {
    console.error("destroySession error:", err);
  }
}

/**
 * Opportunistic maintenance helper to purge expired sessions.
 * Never throws and never interrupts request flows.
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    await db.delete(sessions).where(lt(sessions.expiresAt, nowIso));
  } catch {
    // Non-critical background maintenance
  }
}

/**
 * Gets the current authenticated owner from the session cookie.
 * Returns null if not authenticated or if the session is invalid/expired.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    if (!sessionCookie?.value) return null;

    return await validateSessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

/**
 * Sets the owner session cookie after successful authentication.
 */
export async function setSessionCookie(rawToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Clears the owner session cookie on logout.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ─── Viewer session (password-protected QR) ─────────────────────────────────

/**
 * Checks if the viewer session cookie is valid for a specific QR code.
 * Used to avoid re-prompting for password on multi-file bundles (Blueprint §23).
 */
export async function hasValidViewerSession(qrCodeId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(`${VIEWER_COOKIE_PREFIX}${qrCodeId}`);
    return verifyViewerSessionToken(cookie?.value, qrCodeId);
  } catch {
    return false;
  }
}

/**
 * Sets a short-lived viewer session cookie scoped to one QR code ID.
 */
export async function setViewerSessionCookie(
  qrCodeId: string,
  tokenValue: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`${VIEWER_COOKIE_PREFIX}${qrCodeId}`, tokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Site-wide so /api/serve can re-verify it; the cookie name and the token's
    // HMAC payload both bind it to this single QR code.
    path: "/",
    maxAge: 2 * 60 * 60, // 2 hours
  });
}

/**
 * Extracts client IP from Next.js request headers.
 * Used only for rate-limiting — never stored raw (Blueprint §16).
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Derives coarse device type from User-Agent string.
 */
export function detectDeviceType(
  userAgent: string
): "mobile" | "tablet" | "desktop" | "unknown" {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return "mobile";
  if (ua.length > 0) return "desktop";
  return "unknown";
}

/**
 * Derives coarse browser family from User-Agent string.
 */
export function detectBrowserFamily(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("chrome") && !ua.includes("edg")) return "Chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("edg")) return "Edge";
  if (ua.includes("opera") || ua.includes("opr")) return "Opera";
  return "Other";
}
