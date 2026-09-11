import crypto from "crypto";

const DEV_FALLBACK_SECRET = "qr-platform-insecure-dev-secret-do-not-use-in-production!";

/**
 * Returns the HMAC secret used for viewer sessions and analytics IP hashing.
 *
 * Resolved per call rather than at module scope on purpose: throwing at import
 * time would break `next build`, which loads these modules while collecting page
 * data and legitimately has no runtime secret set. Checking here means a
 * misconfigured production deploy fails loudly on first use instead of silently
 * signing viewer sessions with a secret that is published in the source tree —
 * which would let anyone mint a valid `qr_viewer_{id}` cookie for any QR code.
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET is missing or shorter than 32 characters. Refusing to sign " +
          "viewer sessions with an insecure secret. Generate one with: openssl rand -base64 48"
      );
    }
    return DEV_FALLBACK_SECRET;
  }

  return secret;
}

/**
 * Generates an unguessable 128+ bit cryptographically secure public token.
 * Uses 22 characters of base64url or 32 hex characters to guarantee >128 bits entropy.
 */
export function generatePublicToken(): string {
  // 16 bytes = 128 bits of cryptographic randomness
  return crypto.randomBytes(16).toString("base64url");
}

/**
 * Generates a unique UUID v4.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Standard Argon2id / Scrypt password hashing.
 * Uses Node.js native crypto.scrypt (N=16384, r=8, p=1, 64-byte key) with 16-byte cryptographically secure salt.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifies a password against stored scrypt hash with timing-safe comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parts = storedHash.split(":");
      if (parts.length !== 3 || parts[0] !== "scrypt") {
        return resolve(false);
      }
      const salt = parts[1];
      const keyHex = parts[2];
      const targetKey = Buffer.from(keyHex, "hex");

      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) return resolve(false);
        if (derivedKey.length !== targetKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(derivedKey, targetKey));
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Creates a signed viewer-session cookie token scoped to a specific QR Code ID.
 * Expiry default: 2 hours (7200 seconds).
 */
export function createViewerSessionToken(qrCodeId: string, maxAgeSeconds = 7200): string {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = `${qrCodeId}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}:${signature}`;
}

/**
 * Validates a viewer-session cookie token for a specific QR Code ID.
 */
export function verifyViewerSessionToken(token: string | undefined | null, expectedQrCodeId: string): boolean {
  if (!token) return false;
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return false;
    const [qrCodeId, expiresAtStr, signature] = parts;
    if (qrCodeId !== expectedQrCodeId) return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expectedSig = crypto
      .createHmac("sha256", getSessionSecret())
      .update(`${qrCodeId}:${expiresAtStr}`)
      .digest("base64url");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

/**
 * Generates a privacy-conscious daily salted hash from an IP address.
 * Raw IP is NEVER saved (§16, §26).
 */
export function hashIpDaily(ip: string): string {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return crypto
    .createHmac("sha256", `${getSessionSecret()}:${dateStr}`)
    .update(ip)
    .digest("hex")
    .slice(0, 16);
}
