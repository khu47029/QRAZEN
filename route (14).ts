import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { replaceQrContent } from "@/lib/queries";
import { db } from "@/db";
import { textContent, urlContent } from "@/db/schema";
import { generateId } from "@/lib/crypto";
import { z } from "zod";
import { runMigrations } from "@/db/migrate";

const schema = z.discriminatedUnion("contentType", [
  z.object({
    contentType: z.literal("text"),
    text: z.string().min(1).max(50000),
  }),
  z.object({
    contentType: z.literal("url"),
    url: z.string().url().max(2048).startsWith("http"),
  }),
  z.object({
    contentType: z.literal("pdf"),
  }),
  z.object({
    contentType: z.literal("image"),
  }),
  z.object({
    contentType: z.literal("zip"),
  }),
  z.object({
    contentType: z.literal("multi"),
  }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

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

  try {
    await runMigrations();

    // Create new content version (this IS the entire replacement mechanism — Blueprint §21)
    const newVersion = await replaceQrContent(id, user.id);

    // Insert inline content if applicable (text/url)
    if (parsed.data.contentType === "text") {
      await db.insert(textContent).values({
        id: generateId(),
        contentVersionId: newVersion.id,
        body: parsed.data.text,
      });
    }

    if (parsed.data.contentType === "url") {
      await db.insert(urlContent).values({
        id: generateId(),
        contentVersionId: newVersion.id,
        targetUrl: parsed.data.url,
      });
    }

    // For file-based types (pdf, image, zip, multi), the version is created here;
    // actual file metadata is registered via /api/uploads/complete after the client
    // uploads directly to storage via presigned URL.

    return NextResponse.json({ contentVersion: newVersion }, { status: 201 });
  } catch (err: any) {
    console.error("replace-content error:", err);
    if (err.message?.includes("not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Content replacement failed" }, { status: 500 });
  }
}
