import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyViewerSessionToken } from "@/lib/crypto";
import type { User } from "@/db/schema";

const SESSION_COOKIE = "qr_session";
const VIEWER_COOKIE_PREFIX = "qr_viewer_";

// ─── Owner session ─────────────────────────────────────────────────────────────

/**
 * Gets the current authenticated owner from session cookie.
 * Returns null if not authenticated — never throws.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    if (!sessionCookie?.value) return null;

    // Session cookie value = userId (in production, use signed JWT here)
    const userId = sessionCookie.value;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Sets the owner session cookie after successful login.
 */
export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
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
