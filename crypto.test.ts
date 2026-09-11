import { describe, it, expect, vi, afterEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createViewerSessionToken,
  verifyViewerSessionToken,
  hashIpDaily,
  generatePublicToken,
  generateId,
} from "@/lib/crypto";

const QR_A = "11111111-1111-4111-8111-111111111111";
const QR_B = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("password hashing", () => {
  it("never stores the plaintext password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(hash.split(":")).toHaveLength(3);
  });

  it("salts each hash so identical passwords differ on disk", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
  });

  it("accepts the correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(await verifyPassword("s3cret-pass", hash)).toBe(true);
    expect(await verifyPassword("s3cret-Pass", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
    expect(await verifyPassword("s3cret-pass ", hash)).toBe(false);
  });

  it("rejects malformed or foreign hash formats instead of throwing", async () => {
    for (const bad of [
      "",
      "not-a-hash",
      "scrypt:onlytwo",
      "bcrypt:salt:hash",
      "scrypt::",
      "scrypt:abc:nothex",
    ]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });
});

describe("viewer session tokens", () => {
  it("verifies a freshly minted token for its own QR code", () => {
    const token = createViewerSessionToken(QR_A);
    expect(verifyViewerSessionToken(token, QR_A)).toBe(true);
  });

  it("is bound to one QR code — a valid token cannot be replayed on another", () => {
    const token = createViewerSessionToken(QR_A);
    expect(verifyViewerSessionToken(token, QR_B)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = createViewerSessionToken(QR_A);
    expect(verifyViewerSessionToken(`${token}x`, QR_A)).toBe(false);
    expect(verifyViewerSessionToken(token.slice(0, -1), QR_A)).toBe(false);
  });

  it("rejects a token whose expiry was extended by hand", () => {
    const token = createViewerSessionToken(QR_A);
    const [qrId, , sig] = token.split(":");
    const forged = `${qrId}:${Date.now() + 99999999}:${sig}`;
    expect(verifyViewerSessionToken(forged, QR_A)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createViewerSessionToken(QR_A, -1);
    expect(verifyViewerSessionToken(token, QR_A)).toBe(false);
  });

  it("rejects empty, malformed and absent tokens", () => {
    for (const bad of [undefined, null, "", "a", "a:b", "a:b:c:d"]) {
      expect(verifyViewerSessionToken(bad as string | undefined, QR_A)).toBe(false);
    }
  });

  it("cannot be forged without the secret", () => {
    const real = createViewerSessionToken(QR_A);
    vi.stubEnv("SESSION_SECRET", "a-completely-different-secret-thats-32-chars-plus");
    // Same QR, same shape, signed with the wrong key.
    const forged = createViewerSessionToken(QR_A);
    expect(forged).not.toBe(real);
    vi.unstubAllEnvs();
    expect(verifyViewerSessionToken(forged, QR_A)).toBe(false);
  });
});

describe("production secret guard", () => {
  it("refuses to sign with a missing secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => createViewerSessionToken(QR_A)).toThrow(/SESSION_SECRET/);
  });

  it("refuses to sign with a too-short secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "short");
    expect(() => createViewerSessionToken(QR_A)).toThrow(/32 characters/);
  });

  it("accepts a strong secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "x".repeat(48));
    expect(() => createViewerSessionToken(QR_A)).not.toThrow();
  });
});

describe("analytics IP hashing", () => {
  it("never returns the raw IP", () => {
    const hashed = hashIpDaily("203.0.113.45");
    expect(hashed).not.toContain("203.0.113.45");
    expect(hashed).not.toContain("203");
    expect(hashed).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is stable within a day and distinct per IP", () => {
    expect(hashIpDaily("203.0.113.45")).toBe(hashIpDaily("203.0.113.45"));
    expect(hashIpDaily("203.0.113.45")).not.toBe(hashIpDaily("203.0.113.46"));
  });

  it("rotates with the date so hashes are not a permanent identifier", () => {
    const today = hashIpDaily("203.0.113.45");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 3 * 24 * 3600 * 1000));
    const later = hashIpDaily("203.0.113.45");
    vi.useRealTimers();
    expect(later).not.toBe(today);
  });
});

describe("public tokens", () => {
  it("carries at least 128 bits of entropy in base64url", () => {
    const token = generatePublicToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("does not collide across a large sample", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(generatePublicToken());
    expect(seen.size).toBe(5000);
  });

  it("generates unique ids", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateId());
    expect(seen.size).toBe(1000);
  });
});
