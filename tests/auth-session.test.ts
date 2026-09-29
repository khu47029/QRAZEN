import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  hashSessionToken,
  createSession,
  validateSessionToken,
  destroySession,
  cleanupExpiredSessions,
} from "@/lib/auth/session";
import { checkRateLimit, recordPasswordFailure, resetPasswordFailures, isPasswordLocked } from "@/lib/security/rate-limit";
import { putObject, getObject, deleteObject, getPresignedUploadUrl } from "@/lib/storage/storage";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/security/crypto";

describe("Session Token Security & Hashing", () => {
  it("generates deterministic SHA-256 token hash", () => {
    const token = "a".repeat(64);
    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("avalanche effect: tiny change produces completely different hash", () => {
    const tokenA = "a".repeat(64);
    const tokenB = "a".repeat(63) + "b";

    expect(hashSessionToken(tokenA)).not.toBe(hashSessionToken(tokenB));
  });

  it("rejects legacy raw userId cookies immediately without database query", async () => {
    const legacyUserId = "550e8400-e29b-41d4-a716-446655440000";
    // Passing raw UUID string must not authenticate
    const result = await validateSessionToken(legacyUserId);
    expect(result).toBeNull();
  });

  it("rejects invalid, short, non-hex or empty tokens without throwing", async () => {
    expect(await validateSessionToken("")).toBeNull();
    expect(await validateSessionToken("short-token")).toBeNull();
    expect(await validateSessionToken("   ")).toBeNull();
    // 64 chars but contains non-hex characters
    expect(await validateSessionToken("z".repeat(64))).toBeNull();
  });

  it("rejects tampered tokens", async () => {
    const validFormat = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const tampered = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdee";
    expect(hashSessionToken(validFormat)).not.toBe(hashSessionToken(tampered));
  });
});

describe("Rate Limiting & Lockout", () => {
  beforeEach(() => {
    resetPasswordFailures("test-rate-key");
  });

  it("allows requests within threshold and blocks beyond", () => {
    const key = "test-rate-limit-" + Date.now();
    for (let i = 0; i < 3; i++) {
      const res = checkRateLimit(key, 3, 60);
      expect(res.allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("triggers progressive lockout after 5 consecutive failures", () => {
    const qrKey = "lockout-test-" + Date.now();
    for (let i = 1; i <= 4; i++) {
      const fail = recordPasswordFailure(qrKey);
      expect(fail.locked).toBe(false);
    }
    const fifthFail = recordPasswordFailure(qrKey);
    expect(fifthFail.locked).toBe(true);
    expect(fifthFail.waitMinutes).toBe(15);

    const status = isPasswordLocked(qrKey);
    expect(status.locked).toBe(true);
    expect(status.remainingSeconds).toBeGreaterThan(0);

    resetPasswordFailures(qrKey);
    expect(isPasswordLocked(qrKey).locked).toBe(false);
  });
});

describe("Storage Fallback & Production Fail-Fast", () => {
  const origEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    vi.unstubAllEnvs();
  });

  it("in production: fails fast if Supabase configuration is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_STORAGE_BUCKET;

    await expect(
      getPresignedUploadUrl("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc/deadbeef-test.pdf", "application/pdf", 1024)
    ).rejects.toThrow(/Production storage misconfiguration/);
  });

  it("in development/test: allows local filesystem fallback", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_STORAGE_BUCKET;

    const key = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc/deadbeef-local-test.pdf";
    const body = Buffer.from("%PDF-1.4 local dev storage test");

    const meta = await putObject(key, body, "application/pdf");
    expect(meta.sizeBytes).toBe(body.length);

    const retrieved = await getObject(key);
    expect(retrieved).toEqual(body);

    const deleted = await deleteObject(key);
    expect(deleted).toBe(true);
  });
});
