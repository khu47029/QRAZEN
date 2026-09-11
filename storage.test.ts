import { describe, it, expect, afterAll, vi } from "vitest";
import {
  isValidStorageKey,
  buildStorageKey,
  putObject,
  getObject,
  deleteObject,
  getPresignedUploadUrl,
} from "@/lib/storage";
import { parseZipCentralDirectory } from "@/lib/zip-parser";
import zlib from "zlib";

const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const QR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const createdKeys: string[] = [];

afterAll(async () => {
  for (const k of createdKeys) await deleteObject(k);
});

describe("storage key shape", () => {
  it("builds the canonical key layout", () => {
    const key = buildStorageKey(OWNER, QR, VER, "report.pdf");
    expect(key).toMatch(
      new RegExp(`^${OWNER}/${QR}/${VER}/[0-9a-f]{8}-report\\.pdf$`)
    );
    expect(isValidStorageKey(key)).toBe(true);
  });

  it("sanitises the filename inside the key", () => {
    const key = buildStorageKey(OWNER, QR, VER, "../../../etc/passwd");
    expect(key).not.toContain("../");
    expect(isValidStorageKey(key)).toBe(true);
  });

  it("rejects traversal and malformed keys at the trust boundary", () => {
    const bad = [
      `${OWNER}/../../../etc/passwd`,
      `${OWNER}/${QR}/${VER}/../../../../etc/passwd`,
      "../../etc/passwd",
      "/etc/passwd",
      "C:\\Windows\\System32\\config\\SAM",
      `${OWNER}/${QR}/${VER}/deadbeef-../escape.pdf`,
      `${OWNER}/${QR}/${VER}`,
      `${OWNER}/${QR}/${VER}/nothexprefix-file.pdf`,
      "",
      `${OWNER}/${QR}/${VER}/deadbeef-file.pdf/extra`,
    ];
    for (const key of bad) {
      expect(isValidStorageKey(key), `should reject: ${key}`).toBe(false);
    }
  });
});

describe("object read/write containment", () => {
  it("round-trips a stored object", async () => {
    const key = buildStorageKey(OWNER, QR, VER, "roundtrip.pdf");
    createdKeys.push(key);
    const body = Buffer.from("%PDF-1.4 round trip");
    const meta = await putObject(key, body, "application/pdf");

    expect(meta.sizeBytes).toBe(body.length);
    expect(meta.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(await getObject(key)).toEqual(body);
  });

  it("returns null rather than reading outside the storage root", async () => {
    for (const key of [
      "../../../../../../etc/passwd",
      "../../package.json",
      `${OWNER}/../../../package.json`,
      "\0/etc/passwd",
    ]) {
      expect(await getObject(key), `should not read: ${key}`).toBeNull();
    }
  });

  it("returns null for a well-formed key that does not exist", async () => {
    expect(await getObject(buildStorageKey(OWNER, QR, VER, "absent.pdf"))).toBeNull();
  });
});

describe("storage driver configuration", () => {
  it("issues a local upload URL when no object store is configured", async () => {
    const key = buildStorageKey(OWNER, QR, VER, "x.pdf");
    const res = await getPresignedUploadUrl(key, "application/pdf", 1024);
    expect(res.uploadUrl).toContain("/api/uploads/direct");
    expect(res.storageKey).toBe(key);
  });

  it("refuses to run against a half-configured R2 bucket", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "acct");
    await expect(
      getPresignedUploadUrl("k", "application/pdf", 1024)
    ).rejects.toThrow(/R2 driver is not implemented/);
    vi.unstubAllEnvs();
  });
});

// ─── ZIP handling ─────────────────────────────────────────────────────────────

/** Builds a minimal but structurally real ZIP so the parser is exercised, not stubbed. */
function buildZip(
  entries: { name: string; content: Buffer; uncompressedOverride?: number }[]
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const deflated = zlib.deflateRawSync(e.content);
    const crc = 0;
    const nameBuf = Buffer.from(e.name, "utf8");
    const uncompressed = e.uncompressedOverride ?? e.content.length;

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(uncompressed, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(uncompressed, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    locals.push(local, deflated);
    centrals.push(central);
    offset += local.length + deflated.length;
  }

  const localBlob = Buffer.concat(locals);
  const centralBlob = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBlob.length, 12);
  eocd.writeUInt32LE(localBlob.length, 16);

  return Buffer.concat([localBlob, centralBlob, eocd]);
}

describe("ZIP central directory parsing", () => {
  it("lists entries without decompressing the archive", () => {
    const zip = buildZip([
      { name: "docs/a.txt", content: Buffer.from("hello world") },
      { name: "docs/b.txt", content: Buffer.from("second file") },
    ]);
    const m = parseZipCentralDirectory(zip);

    expect(m.valid).toBe(true);
    expect(m.totalEntries).toBe(2);
    expect(m.entries.map((e) => e.filename)).toEqual(["docs/a.txt", "docs/b.txt"]);
  });

  it("marks directory entries", () => {
    const m = parseZipCentralDirectory(
      buildZip([{ name: "folder/", content: Buffer.alloc(0) }])
    );
    expect(m.entries[0].isDirectory).toBe(true);
  });

  it("refuses a ZIP bomb declaring an absurd uncompressed size", () => {
    const zip = buildZip([
      {
        name: "bomb.txt",
        content: Buffer.from("a".repeat(100)),
        uncompressedOverride: 900 * 1024 * 1024, // over the 500MB ceiling
      },
    ]);
    const m = parseZipCentralDirectory(zip);
    expect(m.valid).toBe(false);
    expect(m.error).toBeTruthy();
  });

  it("refuses an archive whose compression ratio exceeds 100:1", () => {
    const zip = buildZip([
      {
        name: "ratio.txt",
        content: Buffer.from("a".repeat(64)),
        uncompressedOverride: 50 * 1024 * 1024,
      },
    ]);
    const m = parseZipCentralDirectory(zip);
    expect(m.valid).toBe(false);
    expect(m.error).toBeTruthy();
  });

  it("rejects buffers that are not ZIPs at all", () => {
    expect(parseZipCentralDirectory(Buffer.alloc(0)).valid).toBe(false);
    expect(parseZipCentralDirectory(Buffer.from("%PDF-1.4 not a zip")).valid).toBe(false);
    expect(parseZipCentralDirectory(Buffer.alloc(64)).valid).toBe(false);
  });

  it("surfaces traversal-style entry names as data without resolving them", () => {
    const m = parseZipCentralDirectory(
      buildZip([{ name: "../../evil.sh", content: Buffer.from("x") }])
    );
    // The manifest is display metadata only — nothing extracts these paths, but the
    // name must survive verbatim so the viewer can show what is really inside.
    expect(m.valid).toBe(true);
    expect(m.entries[0].filename).toBe("../../evil.sh");
  });
});
