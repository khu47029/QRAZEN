import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { createQrCode, getQrCodesByOwner } from "@/lib/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { runMigrations } from "@/db/migrate";
import { db } from "@/db";
import { textContent, urlContent } from "@/db/schema";
import { generateId } from "@/lib/crypto";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  contentType: z.enum(["text", "url", "pdf", "image", "zip", "multi"]),
  expiresAt: z.string().datetime().nullable().optional(),
  visibility: z.enum(["public", "password"]).default("public"),
  viewerPassword: z.string().min(4).max(128).optional(),
  allowDownload: z.boolean().default(true),
  viewOnly: z.boolean().default(false),
  // Inline content for text/url codes, stored against version 1 so a freshly
  // created code is immediately viewable. File-based types attach their content
  // afterwards via /api/uploads/complete.
  text: z.string().min(1).max(50000).optional(),
  url: z.string().url().max(2048).startsWith("http").optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runMigrations();
    const codes = await getQrCodesByOwner(user.id);
    return NextResponse.json({ codes });
  } catch (err) {
    console.error("GET /api/qr error:", err);
    return NextResponse.json({ error: "Failed to fetch QR codes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit QR creation: 20 per hour per user
  const rateResult = checkRateLimit(`qr_create:${user.id}`, 20, 3600);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "QR creation limit reached. Please wait before creating more." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, contentType, expiresAt, visibility, viewerPassword, allowDownload, viewOnly, text, url } = parsed.data;

  // Validate: password-protected QR must have a password
  if (visibility === "password" && !viewerPassword) {
    return NextResponse.json(
      { error: "A password is required for password-protected QR codes." },
      { status: 400 }
    );
  }

  if (contentType === "text" && !text) {
    return NextResponse.json({ error: "Text content is required." }, { status: 400 });
  }

  if (contentType === "url" && !url) {
    return NextResponse.json({ error: "A destination URL is required." }, { status: 400 });
  }

  try {
    await runMigrations();
    const qrCode = await createQrCode({
      ownerId: user.id,
      name,
      contentType,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      visibility,
      viewerPassword,
      allowDownload,
      viewOnly,
    });

    // Attach inline content to the version createQrCode() just made.
    const versionId = qrCode.currentContentVersionId;
    if (versionId && contentType === "text" && text) {
      await db.insert(textContent).values({
        id: generateId(),
        contentVersionId: versionId,
        body: text,
      });
    }

    if (versionId && contentType === "url" && url) {
      await db.insert(urlContent).values({
        id: generateId(),
        contentVersionId: versionId,
        targetUrl: url,
      });
    }

    return NextResponse.json({ qrCode }, { status: 201 });
  } catch (err) {
    console.error("POST /api/qr error:", err);
    return NextResponse.json({ error: "Failed to create QR code" }, { status: 500 });
  }
}
