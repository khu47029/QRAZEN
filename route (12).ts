import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyUserPassword } from "@/lib/queries";
import { setSessionCookie } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { runMigrations } from "@/db/migrate";

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per 15 minutes per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateResult = checkRateLimit(`login:${ip}`, 10, 900);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait and try again." },
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
    await runMigrations();
    const user = await verifyUserPassword(parsed.data.email, parsed.data.password);

    if (!user) {
      // Use generic message — don't reveal whether email exists
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await setSessionCookie(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
