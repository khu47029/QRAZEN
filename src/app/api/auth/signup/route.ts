import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId, hashPassword, hashIpDaily } from "@/lib/security/crypto";
import { setSessionCookie, createSession, getClientIp } from "@/lib/auth/session";
import { checkPersistentAuthRateLimit, recordPersistentAuthAttempt } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipHash = ip !== "unknown" ? hashIpDaily(ip) : "unknown";

  // Persistent distributed rate limit: 5 signups per 15 minutes across all serverless instances
  const rateResult = await checkPersistentAuthRateLimit("signup", ipHash, 5, 15);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: `Too many registration attempts. Please wait ${rateResult.waitMinutes ?? 15} minute(s) and try again.` },
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  try {
    // Check if email already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));

    if (existing) {
      // Record failed attempt in database
      await recordPersistentAuthAttempt("signup", ipHash, false);

      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const id = generateId();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id,
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      plan: "free",
    });

    // Record successful attempt in database
    await recordPersistentAuthAttempt("signup", ipHash, true);

    const sessionToken = await createSession(id, {
      userAgent: req.headers.get("user-agent") ?? undefined,
      ipHash: ip !== "unknown" ? ipHash : undefined,
    });

    await setSessionCookie(sessionToken);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Account creation failed. Please try again." },
      { status: 500 }
    );
  }
}
