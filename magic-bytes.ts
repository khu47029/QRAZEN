/**
 * Validates file magic bytes against accepted MIME types.
 * Never trusts client-declared Content-Type or file extensions.
 */

export interface MagicByteResult {
  valid: boolean;
  detectedMime?: string;
  error?: string;
}

export function verifyMagicBytes(buffer: Buffer, declaredMime: string): MagicByteResult {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: "File buffer too small or empty" };
  }

  // PDF check: %PDF- (hex: 25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return {
      valid: declaredMime === "application/pdf",
      detectedMime: "application/pdf",
      error: declaredMime !== "application/pdf" ? "Declared MIME does not match PDF signature" : undefined,
    };
  }

  // PNG check: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      valid: declaredMime === "image/png",
      detectedMime: "image/png",
      error: declaredMime !== "image/png" ? "Declared MIME does not match PNG signature" : undefined,
    };
  }

  // JPEG check: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      valid: declaredMime === "image/jpeg" || declaredMime === "image/jpg",
      detectedMime: "image/jpeg",
      error: !["image/jpeg", "image/jpg"].includes(declaredMime) ? "Declared MIME does not match JPEG signature" : undefined,
    };
  }

  // GIF check: GIF87a or GIF89a (47 49 46 38 37 61 or 47 49 46 38 39 61)
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return {
      valid: declaredMime === "image/gif",
      detectedMime: "image/gif",
      error: declaredMime !== "image/gif" ? "Declared MIME does not match GIF signature" : undefined,
    };
  }

  // WebP check: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return {
      valid: declaredMime === "image/webp",
      detectedMime: "image/webp",
      error: declaredMime !== "image/webp" ? "Declared MIME does not match WebP signature" : undefined,
    };
  }

  // ZIP check: PK\x03\x04 (50 4B 03 04) or empty zip PK\x05\x06 (50 4B 05 06)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08))
  ) {
    const isZipMime = [
      "application/zip",
      "application/x-zip-compressed",
      "multipart/x-zip",
    ].includes(declaredMime);
    return {
      valid: isZipMime,
      detectedMime: "application/zip",
      error: !isZipMime ? "Declared MIME does not match ZIP signature" : undefined,
    };
  }

  return {
    valid: false,
    error: `Unsupported or unknown file signature for declared MIME type ${declaredMime}`,
  };
}
