import QRCode from "qrcode";

export interface QrOptions {
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generates a QR code as a PNG data URL.
 * Default error correction: M (medium). Use H if a logo/overlay is embedded.
 */
export async function generateQrPng(
  data: string,
  opts: QrOptions = {}
): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: opts.errorCorrectionLevel ?? "M",
    width: opts.width ?? 400,
    margin: 2,
    color: {
      dark: opts.color?.dark ?? "#000000",
      light: opts.color?.light ?? "#ffffff",
    },
  });
}

/**
 * Generates a QR code as an SVG string.
 */
export async function generateQrSvg(
  data: string,
  opts: QrOptions = {}
): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: opts.errorCorrectionLevel ?? "M",
    width: opts.width ?? 400,
    margin: 2,
    color: {
      dark: opts.color?.dark ?? "#000000",
      light: opts.color?.light ?? "#ffffff",
    },
  });
}

/**
 * Builds the permanent, canonical resolver URL for a QR token.
 * This is the only thing ever encoded into the QR image (Blueprint §21).
 */
export function buildResolverUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/r/${token}`;
}
