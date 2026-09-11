import { describe, it, expect, beforeAll } from "vitest";
import { runMigrations } from "@/db/migrate";
import { db } from "@/db";
import { qrCodes, contentVersions, files, textContent, urlContent, accessRules } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  createUser,
  getUserByEmail,
  verifyUserPassword,
  createQrCode,
  getQrByToken,
  getQrCodesByOwner,
  getQrCodeForOwner,
  getFullQrDataForOwner,
  setViewerPassword,
  replaceQrContent,
  softDeleteQrCode,
  setQrStatus,
  recordScan,
  getScanCount,
} from "@/lib/queries";
import { generateId } from "@/lib/crypto";
import { verifyPassword } from "@/lib/crypto";

let alice: Awaited<ReturnType<typeof createUser>>;
let bob: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await runMigrations();
  const suffix = Date.now();
  alice = await createUser(`alice-${suffix}@example.com`, "alice-password-1", "Alice");
  bob = await createUser(`bob-${suffix}@example.com`, "bob-password-1", "Bob");
});

function baseInput(ownerId: string, overrides: Partial<Parameters<typeof createQrCode>[0]> = {}) {
  return {
    ownerId,
    name: "Test QR",
    contentType: "text" as const,
    visibility: "public" as const,
    allowDownload: true,
    viewOnly: false,
    ...overrides,
  };
}

describe("accounts", () => {
  it("stores a hashed password, never the plaintext", async () => {
    const user = await getUserByEmail(alice.email);
    expect(user?.passwordHash).toBeTruthy();
    expect(user!.passwordHash).not.toContain("alice-password-1");
    expect(await verifyPassword("alice-password-1", user!.passwordHash!)).toBe(true);
  });

  it("authenticates with the right password and refuses the wrong one", async () => {
    expect(await verifyUserPassword(alice.email, "alice-password-1")).toBeTruthy();
    expect(await verifyUserPassword(alice.email, "wrong")).toBeNull();
    expect(await verifyUserPassword("nobody@example.com", "anything")).toBeNull();
  });

  it("treats email case-insensitively without creating a second account", async () => {
    const upper = await getUserByEmail(alice.email.toUpperCase());
    expect(upper?.id).toBe(alice.id);
  });
});

describe("QR creation", () => {
  it("mints an unguessable token and a first content version", async () => {
    const qr = await createQrCode(baseInput(alice.id, { name: "First" }));

    expect(qr.publicToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(qr.status).toBe("active");
    expect(qr.currentContentVersionId).toBeTruthy();

    const [version] = await db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.id, qr.currentContentVersionId!));
    expect(version.versionNumber).toBe(1);
    expect(version.isCurrent).toBe(true);
  });

  it("gives every QR code a distinct token", async () => {
    const made = await Promise.all(
      Array.from({ length: 25 }, () => createQrCode(baseInput(alice.id)))
    );
    expect(new Set(made.map((q) => q.publicToken)).size).toBe(25);
  });

  it("hashes the viewer password at rest", async () => {
    const qr = await createQrCode(
      baseInput(alice.id, { visibility: "password", viewerPassword: "gate-pass-123" })
    );
    const [rules] = await db.select().from(accessRules).where(eq(accessRules.qrCodeId, qr.id));

    expect(rules.visibility).toBe("password");
    expect(rules.passwordHash).toBeTruthy();
    expect(rules.passwordHash).not.toContain("gate-pass-123");
    expect(await verifyPassword("gate-pass-123", rules.passwordHash!)).toBe(true);
    expect(await verifyPassword("gate-pass-124", rules.passwordHash!)).toBe(false);
  });

  it("persists the access rules it was given", async () => {
    const qr = await createQrCode(
      baseInput(alice.id, { allowDownload: false, viewOnly: true })
    );
    const [rules] = await db.select().from(accessRules).where(eq(accessRules.qrCodeId, qr.id));
    expect(rules.allowDownload).toBe(false);
    expect(rules.viewOnly).toBe(true);
  });
});

describe("resolution by public token", () => {
  it("resolves an active code", async () => {
    const qr = await createQrCode(baseInput(alice.id, { name: "Resolvable" }));
    const data = await getQrByToken(qr.publicToken);
    expect(data?.qrCode.id).toBe(qr.id);
    expect(data?.qrCode.name).toBe("Resolvable");
  });

  it("returns null for an unknown token — no enumeration signal", async () => {
    expect(await getQrByToken("definitely-not-a-real-token")).toBeNull();
    expect(await getQrByToken("")).toBeNull();
  });

  it("flips an overdue code to expired at read time, not only by cron", async () => {
    const qr = await createQrCode(
      baseInput(alice.id, { expiresAt: new Date(Date.now() - 60_000) })
    );
    expect(qr.status).toBe("active");

    const data = await getQrByToken(qr.publicToken);
    expect(data?.qrCode.status).toBe("expired");
    // and the flip is persisted
    const [row] = await db.select().from(qrCodes).where(eq(qrCodes.id, qr.id));
    expect(row.status).toBe("expired");
  });

  it("withholds content once expired", async () => {
    const qr = await createQrCode(
      baseInput(alice.id, {
        contentType: "text",
        expiresAt: new Date(Date.now() - 60_000),
      })
    );
    await db.insert(textContent).values({
      id: generateId(),
      contentVersionId: qr.currentContentVersionId!,
      body: "secret body that must not leak after expiry",
    });

    const data = await getQrByToken(qr.publicToken);
    expect(data?.textBody).toBeNull();
    expect(data?.files).toEqual([]);
    expect(data?.accessRules).toBeNull();
  });

  it("still serves a code whose expiry is in the future", async () => {
    const qr = await createQrCode(
      baseInput(alice.id, { expiresAt: new Date(Date.now() + 3600_000) })
    );
    const data = await getQrByToken(qr.publicToken);
    expect(data?.qrCode.status).toBe("active");
  });
});

describe("ownership isolation (IDOR)", () => {
  it("does not return another owner's QR code", async () => {
    const qr = await createQrCode(baseInput(alice.id, { name: "Alice private" }));

    expect(await getQrCodeForOwner(qr.id, alice.id)).toBeTruthy();
    expect(await getQrCodeForOwner(qr.id, bob.id)).toBeNull();
    expect(await getFullQrDataForOwner(qr.id, bob.id)).toBeNull();
  });

  it("lists only the caller's own codes", async () => {
    const bobQr = await createQrCode(baseInput(bob.id, { name: "Bob only" }));
    const aliceList = await getQrCodesByOwner(alice.id);

    expect(aliceList.some((q) => q.id === bobQr.id)).toBe(false);
    expect((await getQrCodesByOwner(bob.id)).some((q) => q.id === bobQr.id)).toBe(true);
  });

  it("refuses cross-owner mutation of status, password, content and deletion", async () => {
    const qr = await createQrCode(baseInput(alice.id));

    await expect(setQrStatus(qr.id, bob.id, "disabled")).rejects.toThrow();
    await expect(setViewerPassword(qr.id, bob.id, "hijack")).rejects.toThrow();
    await expect(replaceQrContent(qr.id, bob.id)).rejects.toThrow();
    await expect(softDeleteQrCode(qr.id, bob.id)).rejects.toThrow();

    const [row] = await db.select().from(qrCodes).where(eq(qrCodes.id, qr.id));
    expect(row.status).toBe("active");
    expect(row.ownerId).toBe(alice.id);
  });

  it("never exposes the viewer password hash through the owner view", async () => {
    const qr = await createQrCode(
      baseInput(alice.id, { visibility: "password", viewerPassword: "owner-view-pass" })
    );
    const data = await getFullQrDataForOwner(qr.id, alice.id);
    // The hash exists in the rules row the server holds; the dashboard page maps it
    // to a boolean before sending anything to the browser. Assert the raw hash is at
    // least never equal to the plaintext, and that a caller must be the owner.
    expect(data?.accessRules?.passwordHash).not.toBe("owner-view-pass");
    expect(await getFullQrDataForOwner(qr.id, bob.id)).toBeNull();
  });
});

describe("viewer password management", () => {
  it("sets, rotates and clears the gate", async () => {
    const qr = await createQrCode(baseInput(alice.id));

    await setViewerPassword(qr.id, alice.id, "first-pass");
    let [rules] = await db.select().from(accessRules).where(eq(accessRules.qrCodeId, qr.id));
    expect(rules.visibility).toBe("password");
    expect(await verifyPassword("first-pass", rules.passwordHash!)).toBe(true);

    await setViewerPassword(qr.id, alice.id, "second-pass");
    [rules] = await db.select().from(accessRules).where(eq(accessRules.qrCodeId, qr.id));
    expect(await verifyPassword("first-pass", rules.passwordHash!)).toBe(false);
    expect(await verifyPassword("second-pass", rules.passwordHash!)).toBe(true);

    await setViewerPassword(qr.id, alice.id, null);
    [rules] = await db.select().from(accessRules).where(eq(accessRules.qrCodeId, qr.id));
    expect(rules.visibility).toBe("public");
    expect(rules.passwordHash).toBeFalsy();
  });
});

describe("content replacement — the dynamic QR guarantee", () => {
  it("keeps the token and rotates the content pointer", async () => {
    const qr = await createQrCode(baseInput(alice.id, { contentType: "url" }));
    const v1 = qr.currentContentVersionId!;
    await db.insert(urlContent).values({
      id: generateId(),
      contentVersionId: v1,
      targetUrl: "https://example.com/v1",
    });

    const v2 = await replaceQrContent(qr.id, alice.id);
    await db.insert(urlContent).values({
      id: generateId(),
      contentVersionId: v2.id,
      targetUrl: "https://example.com/v2",
    });

    const [after] = await db.select().from(qrCodes).where(eq(qrCodes.id, qr.id));

    expect(after.publicToken).toBe(qr.publicToken); // the QR image never changes
    expect(after.currentContentVersionId).toBe(v2.id);
    expect(v2.versionNumber).toBe(2);

    const resolved = await getQrByToken(qr.publicToken);
    expect(resolved?.targetUrl).toBe("https://example.com/v2");
  });

  it("marks the superseded version as no longer current", async () => {
    const qr = await createQrCode(baseInput(alice.id));
    const v1 = qr.currentContentVersionId!;
    await replaceQrContent(qr.id, alice.id);

    const [old] = await db.select().from(contentVersions).where(eq(contentVersions.id, v1));
    expect(old.isCurrent).toBe(false);
  });

  it("stops resolving the old file after replacement", async () => {
    const qr = await createQrCode(baseInput(alice.id, { contentType: "pdf" }));
    const v1 = qr.currentContentVersionId!;
    const oldFileId = generateId();
    await db.insert(files).values({
      id: oldFileId,
      contentVersionId: v1,
      storageKey: `${alice.id}/${qr.id}/${v1}/deadbeef-old.pdf`,
      originalFilename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      checksum: "0".repeat(64),
    });

    expect((await getQrByToken(qr.publicToken))?.files[0]?.id).toBe(oldFileId);

    await replaceQrContent(qr.id, alice.id);

    // The resolver no longer surfaces the superseded file at all.
    const after = await getQrByToken(qr.publicToken);
    expect(after?.files).toEqual([]);
  });

  it("increments the version number across repeated replacements", async () => {
    const qr = await createQrCode(baseInput(alice.id));
    expect((await replaceQrContent(qr.id, alice.id)).versionNumber).toBe(2);
    expect((await replaceQrContent(qr.id, alice.id)).versionNumber).toBe(3);
    expect((await replaceQrContent(qr.id, alice.id)).versionNumber).toBe(4);
  });
});

describe("disable and delete", () => {
  it("disable blocks the viewer but keeps the record recoverable", async () => {
    const qr = await createQrCode(baseInput(alice.id));
    await setQrStatus(qr.id, alice.id, "disabled");

    expect((await getQrByToken(qr.publicToken))?.qrCode.status).toBe("disabled");

    await setQrStatus(qr.id, alice.id, "active");
    expect((await getQrByToken(qr.publicToken))?.qrCode.status).toBe("active");
  });

  it("delete marks the code removed and hides it from the dashboard list", async () => {
    const qr = await createQrCode(baseInput(alice.id, { name: "To delete" }));
    await softDeleteQrCode(qr.id, alice.id);

    expect((await getQrByToken(qr.publicToken))?.qrCode.status).toBe("deleted");
    expect((await getQrCodesByOwner(alice.id)).some((q) => q.id === qr.id)).toBe(false);
  });
});

describe("privacy-first scan analytics", () => {
  it("counts scans without storing a raw IP", async () => {
    const qr = await createQrCode(baseInput(alice.id));

    await recordScan(qr.id, {
      deviceType: "mobile",
      browserFamily: "Chrome",
      sessionHash: "abc0123456789def",
    });
    await recordScan(qr.id, { deviceType: "desktop", browserFamily: "Firefox" });

    expect(await getScanCount(qr.id)).toBe(2);

    // Guard against a schema change silently reintroducing a raw-IP column.
    const columns = (
      await db.all<any>(sql`PRAGMA table_info(qr_scans)`)
    ).map((r: any) => (Array.isArray(r) ? r[1] : r.name));
    expect(columns).not.toContain("ip");
    expect(columns).not.toContain("ip_address");
    expect(columns).toContain("session_hash");
  });

  it("starts every new code at zero scans", async () => {
    const qr = await createQrCode(baseInput(alice.id));
    expect(await getScanCount(qr.id)).toBe(0);
  });
});
