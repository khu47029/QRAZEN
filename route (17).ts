import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getQrCodeForOwner } from "@/lib/queries";
import { generateQrPng, generateQrSvg, buildResolverUrl } from "@/lib/qr-generator";

/**
 * Renders the owner's QR code as a downloadable PNG or SVG.
 *
 * The encoded payload is always buildResolverUrl(publicToken) and never the
 * content itself — that indirection is what lets content be replaced without
 * reprinting the code (Blueprint §21).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const qr = await getQrCodeForOwner(id, user.id);
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const format = req.nextUrl.searchParams.get("format") === "svg" ? "svg" : "png";
  const download = req.nextUrl.searchParams.get("download") === "1";

  // Clamped: an unbounded width would let one request allocate a huge bitmap.
  const requestedWidth = Number(req.nextUrl.searchParams.get("width") ?? 400);
  const width = Number.isFinite(requestedWidth)
    ? Math.min(Math.max(Math.trunc(requestedWidth), 128), 2000)
    : 400;

  const resolverUrl = buildResolverUrl(qr.publicToken);
  const safeName = (qr.name || "qr-code").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);

  try {
    if (format === "svg") {
      const svg = await generateQrSvg(resolverUrl, { width });
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}.svg"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    // generateQrPng returns a data URL; decode it back to raw bytes so the
    // response is a real image file rather than a base64 text blob.
    const dataUrl = await generateQrPng(resolverUrl, { width });
    const base64 = dataUrl.split(",")[1] ?? "";
    const buffer = Buffer.from(base64, "base64");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/qr/:id/qr-image error:", err);
    return NextResponse.json({ error: "Could not generate QR image" }, { status: 500 });
  }
}
