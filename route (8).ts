import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildStorageKey, getPresignedUploadUrl } from "@/lib/storage";
import { db } from "@/db";
import { qrCodes, contentVersions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
];

const PLAN_SIZE_LIMITS: Record<string, number> = {
  free: 10 * 1024 * 1024,      // 10MB
  pro: 100 * 1024 * 1024,      // 100MB
  business: 500 * 1024 * 1024, // 500MB
};

const schema = z.object({
  qrCodeId: z.string().uuid(),
  contentVersionId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit uploads per user
  const rateResult = checkRateLimit(`upload:${user.id}`, 50, 3600);
  if (!rateResult.allowed) {
    return NextResponse.json({ error: "Upload rate limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { qrCodeId, contentVersionId, filename, mimeType, sizeBytes } = parsed.data;

  // Check MIME allow-list — BEFORE issuing any upload URL (Blueprint §15)
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: `File type '${mimeType}' is not permitted.` },
      { status: 415 }
    );
  }

  // Check plan size limit
  const planLimit = PLAN_SIZE_LIMITS[user.plan] ?? PLAN_SIZE_LIMITS.free;
  if (sizeBytes > planLimit) {
    const limitMB = Math.round(planLimit / 1024 / 1024);
    return NextResponse.json(
      { error: `File exceeds the ${limitMB}MB limit for your plan.` },
      { status: 413 }
    );
  }

  // Authorize the target before minting an upload URL (Blueprint §14).
  // /api/uploads/complete re-checks this, so skipping it here would not expose
  // another user's content — but it would let a caller write orphaned bytes into
  // storage against a QR id they don't own, which is never legitimate.
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, qrCodeId), eq(qrCodes.ownerId, user.id)));

  if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });

  const [version] = await db
    .select()
    .from(contentVersions)
    .where(
      and(
        eq(contentVersions.id, contentVersionId),
        eq(contentVersions.qrCodeId, qrCodeId)
      )
    );

  if (!version) {
    return NextResponse.json({ error: "Content version not found" }, { status: 404 });
  }

  // Build storage key — NEVER derived from user input (Blueprint §11, §15)
  const storageKey = buildStorageKey(user.id, qrCodeId, contentVersionId, filename);

  const presigned = await getPresignedUploadUrl(storageKey, mimeType, sizeBytes);

  return NextResponse.json({
    uploadUrl: presigned.uploadUrl,
    storageKey: presigned.storageKey,
    expiresInSeconds: presigned.expiresInSeconds,
    headers: presigned.headers ?? {},
  });
}
