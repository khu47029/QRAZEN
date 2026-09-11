import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId, hashPassword } from "@/lib/crypto";
import { setSessionCookie } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { runMigrations } from "@/db/migrate";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  // Rate limit signup attempts: 5 per 15 minutes per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateResult = checkRateLimit(`signup:${ip}`, 5, 900);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
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
    // Ensure database is initialized
    await runMigrations();

    // Check if email already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));

    if (existing) {
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

    await setSessionCookie(id);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Account creation failed. Please try again." },
      { status: 500 }
    );
  }
}
