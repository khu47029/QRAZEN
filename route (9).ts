import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { files, contentVersions, qrCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/crypto";
import { getObject, isValidStorageKey } from "@/lib/storage";
import { verifyMagicBytes } from "@/lib/magic-bytes";
import { parseZipCentralDirectory } from "@/lib/zip-parser";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  storageKey: z.string().min(1).max(500),
  contentVersionId: z.string().uuid(),
  qrCodeId: z.string().uuid(),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { storageKey, contentVersionId, qrCodeId, originalFilename, mimeType, sizeBytes } = parsed.data;

  // Reject any key that isn't exactly the shape buildStorageKey() emits. This is
  // the trust boundary for path traversal — startsWith(ownerId) alone would let
  // "<ownerId>/../../../etc/passwd" through into getObject().
  if (!isValidStorageKey(storageKey)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  // Verify the storage key belongs to this user (must start with ownerId/)
  if (!storageKey.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify QR ownership (Blueprint §14)
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, qrCodeId), eq(qrCodes.ownerId, user.id)));

  if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });

  // The version must belong to the QR the caller claims, otherwise a user could
  // attach files to someone else's content version by guessing its id.
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

  // Read the uploaded file for magic-byte verification (Blueprint §15)
  const buffer = await getObject(storageKey);
  if (!buffer) {
    return NextResponse.json(
      { error: "Upload not found — please retry the upload." },
      { status: 422 }
    );
  }

  // Magic-byte check — never trust declared Content-Type
  const magicResult = verifyMagicBytes(buffer, mimeType);
  if (!magicResult.valid) {
    // Delete the invalid file immediately
    try {
      const { deleteObject } = await import("@/lib/storage");
      await deleteObject(storageKey);
    } catch {}
    return NextResponse.json(
      { error: magicResult.error || "File signature check failed." },
      { status: 422 }
    );
  }

  // For ZIP files: parse central directory for manifest (no full decompression)
  let zipManifestJson: string | null = null;
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    const manifest = parseZipCentralDirectory(buffer);
    if (!manifest.valid) {
      return NextResponse.json(
        { error: manifest.error || "Invalid or unsafe ZIP file." },
        { status: 422 }
      );
    }
    zipManifestJson = JSON.stringify(manifest);
  }

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  await db.insert(files).values({
    id: generateId(),
    contentVersionId,
    storageKey,
    originalFilename,
    mimeType,
    sizeBytes: buffer.length, // Use actual size, not client-declared
    checksum,
    zipManifestJson,
  });

  return NextResponse.json({ success: true, checksum });
}
