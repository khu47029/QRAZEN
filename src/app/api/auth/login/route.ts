import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyUserPassword } from "@/lib/auth/user-queries";
import { setSessionCookie, createSession, getClientIp } from "@/lib/auth/session";
import { checkPersistentAuthRateLimit, recordPersistentAuthAttempt } from "@/lib/security/rate-limit";
import { hashIpDaily } from "@/lib/security/crypto";

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipHash = ip !== "unknown" ? hashIpDaily(ip) : "unknown";

  // Persistent distributed rate limit: 10 attempts per 15 minutes across all serverless instances
  const rateResult = await checkPersistentAuthRateLimit("login", ipHash, 10, 15);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Please wait ${rateResult.waitMinutes ?? 15} minute(s) and try again.` },
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
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  try {
    const user = await verifyUserPassword(parsed.data.email, parsed.data.password);

    if (!user) {
      // Record failed attempt persistently in database
      await recordPersistentAuthAttempt("login", ipHash, false);

      // Use generic message — don't reveal whether email exists
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Record successful attempt in database
    await recordPersistentAuthAttempt("login", ipHash, true);

    const sessionToken = await createSession(user.id, {
      userAgent: req.headers.get("user-agent") ?? undefined,
      ipHash: ip !== "unknown" ? ipHash : undefined,
    });

    await setSessionCookie(sessionToken);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
