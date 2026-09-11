import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  getQrCodeForOwner,
  softDeleteQrCode,
  setQrStatus,
  replaceQrContent,
} from "@/lib/queries";
import { db } from "@/db";
import { qrCodes, accessRules } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  allowDownload: z.boolean().optional(),
  viewOnly: z.boolean().optional(),
  visibility: z.enum(["public", "password"]).optional(),
  // Send a string to set/rotate the viewer password, or null to clear it.
  viewerPassword: z.string().min(4).max(128).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const qr = await getQrCodeForOwner(id, user.id);
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ qrCode: qr });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership before any update (Blueprint §14 — no IDOR)
  const existing = await getQrCodeForOwner(id, user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updates = parsed.data;

  // Fetch the current rules so we can tell whether a password already exists.
  const [currentRules] = await db
    .select()
    .from(accessRules)
    .where(eq(accessRules.qrCodeId, id));

  // Turning protection on requires an actual password — either supplied now or
  // already stored. Otherwise the gate would render with nothing to match and
  // the content would be unreachable rather than protected.
  const willHavePassword =
    updates.viewerPassword != null ||
    (updates.viewerPassword === undefined && !!currentRules?.passwordHash);

  if (updates.visibility === "password" && !willHavePassword) {
    return NextResponse.json(
      { error: "Set a password before enabling password protection." },
      { status: 400 }
    );
  }

  try {
    // Update qr_codes fields
    const qrUpdates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (updates.name !== undefined) qrUpdates.name = updates.name;
    if (updates.status !== undefined) qrUpdates.status = updates.status;
    if (updates.expiresAt !== undefined) qrUpdates.expiresAt = updates.expiresAt;

    await db.update(qrCodes)
      .set(qrUpdates)
      .where(and(eq(qrCodes.id, id), eq(qrCodes.ownerId, user.id)));

    // Update access_rules fields
    const ruleUpdates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (updates.allowDownload !== undefined) ruleUpdates.allowDownload = updates.allowDownload;
    if (updates.viewOnly !== undefined) ruleUpdates.viewOnly = updates.viewOnly;
    if (updates.visibility !== undefined) ruleUpdates.visibility = updates.visibility;

    if (updates.viewerPassword !== undefined) {
      if (updates.viewerPassword === null) {
        // Clearing the password also drops protection, so a code can never be
        // left marked "password" with no hash to check against.
        ruleUpdates.passwordHash = null;
        ruleUpdates.visibility = "public";
      } else {
        ruleUpdates.passwordHash = await hashPassword(updates.viewerPassword);
        ruleUpdates.visibility = updates.visibility ?? "password";
      }
    }

    if (Object.keys(ruleUpdates).length > 1) {
      await db.update(accessRules)
        .set(ruleUpdates)
        .where(eq(accessRules.qrCodeId, id));
    }

    const updated = await getQrCodeForOwner(id, user.id);
    return NextResponse.json({ qrCode: updated });
  } catch (err) {
    console.error("PATCH /api/qr/:id error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await softDeleteQrCode(id, user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message?.includes("not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
