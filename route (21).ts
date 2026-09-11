import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accessRules, qrCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createViewerSessionToken } from "@/lib/crypto";
import {
  checkRateLimit,
  recordPasswordFailure,
  resetPasswordFailures,
  isPasswordLocked,
} from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(1).max(128),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Rate limit by IP: 10 attempts per 10 minutes (Blueprint §23)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateKey = `pw_verify:${token}:${ip}`;
  const lockCheck = isPasswordLocked(rateKey);
  if (lockCheck.locked) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Please wait ${Math.ceil((lockCheck.remainingSeconds ?? 0) / 60)} minute(s).`,
        locked: true,
      },
      { status: 429 }
    );
  }

  const rateResult = checkRateLimit(rateKey, 10, 600);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later.", locked: false },
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
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  // Look up the QR code and its access rules
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.publicToken, token));

  if (!qr) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [rules] = await db
    .select()
    .from(accessRules)
    .where(eq(accessRules.qrCodeId, qr.id));

  if (!rules || !rules.passwordHash) {
    return NextResponse.json({ error: "Not password protected." }, { status: 400 });
  }

  // Timing-safe password verification (Blueprint §23)
  const valid = await verifyPassword(parsed.data.password, rules.passwordHash);

  if (!valid) {
    const failResult = recordPasswordFailure(rateKey);
    if (failResult.locked) {
      return NextResponse.json(
        { error: `Incorrect password. Account locked for ${failResult.waitMinutes} minutes.`, locked: true },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Incorrect password. Please try again.", locked: false },
      { status: 401 }
    );
  }

  resetPasswordFailures(rateKey);

  // Issue viewer session cookie scoped to this QR (Blueprint §23)
  const sessionToken = createViewerSessionToken(qr.id, 7200);

  const response = NextResponse.json({ success: true });
  response.cookies.set(`qr_viewer_${qr.id}`, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Must be site-wide, not /r/<token>: the file-serving route re-checks this
    // same cookie, and a path-scoped cookie would never be sent to /api/serve.
    // Scoping stays tight because the cookie NAME carries the QR id and the
    // token itself is HMAC-bound to that id.
    path: "/",
    maxAge: 7200,
  });

  return response;
}
