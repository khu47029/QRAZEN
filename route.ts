import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { putObject } from "@/lib/storage";

/**
 * Local-development stand-in for an S3/R2 presigned PUT.
 *
 * getPresignedUploadUrl() returns this path when no bucket credentials are
 * configured. It deliberately re-authenticates instead of trusting the URL:
 * unlike a real presigned URL, this endpoint has no signature to verify, so the
 * session and the key's owner prefix ARE the authorization (Blueprint §15).
 *
 * Bytes written here are not yet trusted content — /api/uploads/complete still
 * performs the magic-byte check before any file row is created.
 */

const PLAN_SIZE_LIMITS: Record<string, number> = {
  free: 10 * 1024 * 1024, // 10MB
  pro: 100 * 1024 * 1024, // 100MB
  business: 500 * 1024 * 1024, // 500MB
};

// {ownerId}/{qrCodeId}/{versionId}/{shortHash}-{sanitizedFilename}
// Anchored, and the character class excludes "." runs and separators, so no
// traversal sequence can survive (Blueprint §11).
const STORAGE_KEY_PATTERN =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f]{8}-[a-zA-Z0-9._-]{1,100}$/;

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateResult = checkRateLimit(`upload_put:${user.id}`, 50, 3600);
  if (!rateResult.allowed) {
    return NextResponse.json({ error: "Upload rate limit exceeded." }, { status: 429 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key || !STORAGE_KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  // The key embeds the owner id; a user may only write under their own prefix.
  if (!key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const planLimit = PLAN_SIZE_LIMITS[user.plan] ?? PLAN_SIZE_LIMITS.free;

  // Reject oversized uploads on the declared length before reading the body,
  // so an attacker cannot force us to buffer 500MB to find out it's too big.
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > planLimit) {
    return NextResponse.json(
      { error: `File exceeds the ${Math.round(planLimit / 1024 / 1024)}MB limit for your plan.` },
      { status: 413 }
    );
  }

  const body = await req.arrayBuffer();
  const buffer = Buffer.from(body);

  if (buffer.length === 0) {
    return NextResponse.json({ error: "Empty upload" }, { status: 400 });
  }

  // Re-check the real length: Content-Length is client-supplied.
  if (buffer.length > planLimit) {
    return NextResponse.json(
      { error: `File exceeds the ${Math.round(planLimit / 1024 / 1024)}MB limit for your plan.` },
      { status: 413 }
    );
  }

  try {
    const meta = await putObject(key, buffer, "application/octet-stream");
    return NextResponse.json({
      success: true,
      storageKey: meta.storageKey,
      sizeBytes: meta.sizeBytes,
    });
  } catch (err) {
    console.error("PUT /api/uploads/direct error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// The client uses PUT; POST is accepted as an alias so form-style clients work.
export const POST = PUT;
