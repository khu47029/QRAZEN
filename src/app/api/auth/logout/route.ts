import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, destroySession } from "@/lib/auth/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("qr_session")?.value;
    if (token) {
      await destroySession(token);
    }
  } catch (err) {
    console.error("Logout session destruction error:", err);
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
