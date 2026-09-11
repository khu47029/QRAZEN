import { describe, it, expect } from "vitest";
import { verifyMagicBytes } from "@/lib/magic-bytes";
import { sanitizeFilename, formatBytes } from "@/lib/utils";

const PDF = Buffer.from("%PDF-1.7\n...");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const GIF = Buffer.from("GIF89a....");
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from("WEBP"),
]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]);

describe("magic byte validation — content must match the declared type", () => {
  it("accepts each supported type when the declaration is honest", () => {
    expect(verifyMagicBytes(PDF, "application/pdf").valid).toBe(true);
    expect(verifyMagicBytes(PNG, "image/png").valid).toBe(true);
    expect(verifyMagicBytes(JPEG, "image/jpeg").valid).toBe(true);
    expect(verifyMagicBytes(JPEG, "image/jpg").valid).toBe(true);
    expect(verifyMagicBytes(GIF, "image/gif").valid).toBe(true);
    expect(verifyMagicBytes(WEBP, "image/webp").valid).toBe(true);
    expect(verifyMagicBytes(ZIP, "application/zip").valid).toBe(true);
    expect(verifyMagicBytes(ZIP, "application/x-zip-compressed").valid).toBe(true);
  });

  it("rejects MIME spoofing — a PDF renamed as an image", () => {
    const r = verifyMagicBytes(PDF, "image/png");
    expect(r.valid).toBe(false);
    expect(r.detectedMime).toBe("application/pdf");
  });

  it("rejects an executable/script disguised as an allowed type", () => {
    // Windows PE header
    expect(verifyMagicBytes(Buffer.from([0x4d, 0x5a, 0x90, 0x00]), "application/pdf").valid).toBe(false);
    // ELF
    expect(verifyMagicBytes(Buffer.from([0x7f, 0x45, 0x4c, 0x46]), "image/png").valid).toBe(false);
    // Shell script
    expect(verifyMagicBytes(Buffer.from("#!/bin/sh\nrm -rf /"), "application/pdf").valid).toBe(false);
    // HTML (stored XSS vector if served inline)
    expect(verifyMagicBytes(Buffer.from("<html><script>alert(1)</script>"), "image/png").valid).toBe(false);
    // SVG with script — SVG is not in the allow-list at all
    expect(verifyMagicBytes(Buffer.from('<svg onload="alert(1)">'), "image/svg+xml").valid).toBe(false);
  });

  it("uses a closed allow-list — unknown signatures are refused, not passed through", () => {
    const r = verifyMagicBytes(Buffer.from([0x00, 0x01, 0x02, 0x03]), "application/pdf");
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("rejects empty and truncated buffers", () => {
    expect(verifyMagicBytes(Buffer.alloc(0), "application/pdf").valid).toBe(false);
    expect(verifyMagicBytes(Buffer.from([0x25, 0x50]), "application/pdf").valid).toBe(false);
  });

  it("rejects a PNG signature truncated below its 8-byte header", () => {
    expect(verifyMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47]), "image/png").valid).toBe(false);
  });
});

describe("filename sanitisation", () => {
  it("neutralises path traversal", () => {
    expect(sanitizeFilename("../../../etc/passwd")).not.toContain("/");
    expect(sanitizeFilename("..\\..\\windows\\system32")).not.toContain("\\");
    expect(sanitizeFilename("../../etc/passwd")).toBe(".._.._etc_passwd");
  });

  it("strips characters that could break headers or shells", () => {
    expect(sanitizeFilename('in"voice.pdf')).toBe("in_voice.pdf");
    expect(sanitizeFilename("re;port|1.pdf")).toBe("re_port_1.pdf");
    expect(sanitizeFilename("a\r\nb.pdf")).toBe("a__b.pdf");
    expect(sanitizeFilename("null\0byte.pdf")).toBe("null_byte.pdf");
  });

  it("keeps ordinary names readable", () => {
    expect(sanitizeFilename("Q3-report_final.v2.pdf")).toBe("Q3-report_final.v2.pdf");
  });

  it("caps length so a long name cannot blow out the storage key", () => {
    expect(sanitizeFilename("a".repeat(500)).length).toBe(100);
  });
});

describe("formatBytes", () => {
  it("formats the sizes the UI actually shows", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });
});
