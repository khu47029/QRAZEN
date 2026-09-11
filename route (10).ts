import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { abuseReports, qrCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId, hashIpDaily } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { runMigrations } from "@/db/migrate";
import { z } from "zod";

/**
 * Public abuse reporting (Blueprint §26). Deliberately unauthenticated: the
 * people best placed to flag malicious content are anonymous scanners.
 *
 * The reporter's IP is hashed with the daily rotating salt and never stored raw.
 */

const schema = z.object({
  qrCodeId: z.string().uuid(),
  reason: z.enum(["illegal", "malware", "phishing", "copyright", "spam", "other"]),
  details: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // 5 reports per hour per IP — enough for a genuine reporter, not enough to
  // flood a competitor's code with false flags.
  const rateResult = checkRateLimit(`abuse:${ip}`, 5, 3600);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many reports. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please select a reason for the report." }, { status: 400 });
  }

  try {
    await runMigrations();

    const [qr] = await db
      .select({ id: qrCodes.id })
      .from(qrCodes)
      .where(eq(qrCodes.id, parsed.data.qrCodeId));

    // Respond identically for unknown ids so this endpoint can't be used to
    // probe which QR code ids exist.
    if (!qr) return NextResponse.json({ success: true });

    await db.insert(abuseReports).values({
      id: generateId(),
      qrCodeId: parsed.data.qrCodeId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
      reporterIpHash: ip !== "unknown" ? hashIpDaily(ip) : null,
      status: "open",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/abuse error:", err);
    return NextResponse.json({ error: "Could not submit report." }, { status: 500 });
  }
}
