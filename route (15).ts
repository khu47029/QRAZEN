import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { qrScans, qrCodes } from "@/db/schema";
import { db } from "@/db";
import { eq, and, desc, gte } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership first (Blueprint §14)
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.ownerId, user.id)));

  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scans = await db
    .select()
    .from(qrScans)
    .where(eq(qrScans.qrCodeId, id))
    .orderBy(desc(qrScans.scannedAt));

  // Build aggregate stats (privacy-first — no individual tracking)
  const total = scans.length;

  const byDevice: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byBrowser: Record<string, number> = {};
  const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let recent = 0;

  for (const scan of scans) {
    if (scan.deviceType) byDevice[scan.deviceType] = (byDevice[scan.deviceType] || 0) + 1;
    if (scan.country) byCountry[scan.country] = (byCountry[scan.country] || 0) + 1;
    if (scan.browserFamily) byBrowser[scan.browserFamily] = (byBrowser[scan.browserFamily] || 0) + 1;
    if (scan.scannedAt && new Date(scan.scannedAt).getTime() >= last30Days) recent++;
  }

  return NextResponse.json({
    total,
    last30Days: recent,
    byDevice,
    byCountry,
    byBrowser,
  });
}
