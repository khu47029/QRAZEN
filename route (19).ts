import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { files, contentVersions, qrCodes, accessRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getObject } from "@/lib/storage";
import { verifyViewerSessionToken } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/session";

/**
 * The ONLY path by which stored bytes reach a client.
 *
 * Storage keys are never exposed and the bucket is never public, so every read
 * re-runs the full access decision: status, expiry, password session, and the
 * owner's download/view-only rules (Blueprint §12, §15, §22). A signed URL
 * handed out once could not be revoked when the owner disables a code — this
 * route can, because it re-checks on every single request.
 */

// Only these types are ever echoed back with their stored Content-Type.
// Anything else is forced to octet-stream so a stored file can never execute
// as active content inside the viewer's own origin.
const INLINE_SAFE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wantsDownload = req.nextUrl.searchParams.get("download") === "1";

  const [file] = await db.select().from(files).where(eq(files.id, id));
  if (!file) return deny(404, "Not found");

  const [version] = await db
    .select()
    .from(contentVersions)
    .where(eq(contentVersions.id, file.contentVersionId));
  if (!version) return deny(404, "Not found");

  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.id, version.qrCodeId));
  if (!qr) return deny(404, "Not found");

  const user = await getCurrentUser();
  const isOwner = user?.id === qr.ownerId;

  // Superseded content stops serving the moment the pointer moves. Without this
  // check, "replace content" would leave the old file permanently reachable by
  // anyone who kept the file id (Blueprint §21).
  if (!isOwner && qr.currentContentVersionId !== file.contentVersionId) {
    return deny(410, "This content has been replaced");
  }

  // Owners may always read their own files so they can verify what viewers get,
  // even while a code is disabled or expired. Everyone else runs the gauntlet.
  if (!isOwner) {
    if (qr.status === "deleted") return deny(410, "Content removed");
    if (qr.status === "disabled") return deny(403, "This QR code is disabled");
    if (qr.status === "expired") return deny(410, "Content has expired");
    if (qr.expiresAt && new Date(qr.expiresAt) <= new Date()) {
      return deny(410, "Content has expired");
    }

    const [rules] = await db
      .select()
      .from(accessRules)
      .where(eq(accessRules.qrCodeId, qr.id));

    if (rules?.visibility === "password") {
      const cookieStore = await cookies();
      const token = cookieStore.get(`qr_viewer_${qr.id}`)?.value;
      if (!verifyViewerSessionToken(token, qr.id)) {
        return deny(401, "Password required");
      }
    }

    // view-only and allow_download are enforced here, not just hidden in the UI.
    if (wantsDownload && (rules?.allowDownload === false || rules?.viewOnly)) {
      return deny(403, "Downloads are disabled for this content");
    }
  }

  const buffer = await getObject(file.storageKey);
  if (!buffer) return deny(404, "File is no longer available");

  const safeMime = INLINE_SAFE_MIME.has(file.mimeType)
    ? file.mimeType
    : "application/octet-stream";

  // Unknown types are never rendered inline, regardless of what was requested.
  const disposition =
    wantsDownload || safeMime === "application/octet-stream"
      ? "attachment"
      : "inline";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": safeMime,
      "Content-Length": String(buffer.length),
      "Content-Disposition": buildContentDisposition(
        disposition,
        file.originalFilename
      ),
      // Never let a stored file be sniffed into something executable.
      "X-Content-Type-Options": "nosniff",
      // The PDF viewer iframes this route, so same-origin framing must work —
      // but no third-party site may embed the content.
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "no-referrer",
      // Access can be revoked at any time, so shared caches must not keep copies.
      "Cache-Control": "private, no-store, must-revalidate",
    },
  });
}

/**
 * Builds an RFC 6266 Content-Disposition header.
 * Header injection is impossible here: the ASCII fallback is stripped to a safe
 * subset and the UTF-8 form is percent-encoded.
 */
function buildContentDisposition(type: string, filename: string): string {
  const asciiFallback =
    filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\;\r\n]/g, "_") || "file";
  const utf8 = encodeURIComponent(filename);
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${utf8}`;
}

/**
 * Error responses carry no filenames, MIME types, or owner details — a prober
 * learns only that they may not have this byte range.
 */
function deny(status: number, message: string) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}
