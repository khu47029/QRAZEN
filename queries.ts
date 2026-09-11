import { db } from "@/db";
import {
  users,
  qrCodes,
  contentVersions,
  files,
  textContent,
  urlContent,
  accessRules,
  qrScans,
  passwordAttempts,
  auditLog,
} from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  generateId,
  generatePublicToken,
  hashPassword,
  verifyPassword,
} from "@/lib/crypto";
import type { InsertUser, User, QrCode, AccessRules, ContentVersion, FileRecord } from "@/db/schema";

// ─── types ───────────────────────────────────────────────────────────────────

export type ContentType = "text" | "url" | "pdf" | "image" | "zip" | "multi";
export type QrStatus = "active" | "disabled" | "deleted" | "expired";

export interface CreateQrInput {
  ownerId: string;
  name: string;
  contentType: ContentType;
  expiresAt?: Date | null;
  visibility: "public" | "password";
  viewerPassword?: string;
  allowDownload: boolean;
  viewOnly: boolean;
}

export interface QrWithRules {
  qrCode: QrCode;
  accessRules: AccessRules | null;
}

export interface FullQrData {
  qrCode: QrCode;
  accessRules: AccessRules | null;
  currentVersion: ContentVersion | null;
  files: FileRecord[];
  textBody: string | null;
  targetUrl: string | null;
}

// ─── User operations ─────────────────────────────────────────────────────────

export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const id = generateId();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id,
    email: email.toLowerCase().trim(),
    passwordHash,
    name,
    plan: "free",
  });

  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()));
  return user ?? null;
}

export async function verifyUserPassword(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

// ─── QR Code operations ───────────────────────────────────────────────────────

/**
 * Creates a new QR code + first content_version + access_rules row.
 */
export async function createQrCode(input: CreateQrInput): Promise<QrCode> {
  const qrId = generateId();
  const versionId = generateId();
  const publicToken = generatePublicToken();
  const rulesId = generateId();

  await db.insert(qrCodes).values({
    id: qrId,
    ownerId: input.ownerId,
    publicToken,
    name: input.name,
    contentType: input.contentType,
    status: "active",
    currentContentVersionId: versionId,
    expiresAt: input.expiresAt?.toISOString() ?? null,
  });

  await db.insert(contentVersions).values({
    id: versionId,
    qrCodeId: qrId,
    versionNumber: 1,
    isCurrent: true,
  });

  const passwordHash = input.viewerPassword
    ? await hashPassword(input.viewerPassword)
    : null;

  await db.insert(accessRules).values({
    id: rulesId,
    qrCodeId: qrId,
    visibility: input.visibility,
    passwordHash,
    allowDownload: input.allowDownload,
    viewOnly: input.viewOnly,
  });

  await logAudit(input.ownerId, "qr_code.create", "qr_code", qrId);

  const [created] = await db.select().from(qrCodes).where(eq(qrCodes.id, qrId));
  return created;
}

/**
 * Fetches a QR code by its public token — used by the resolver.
 * Checks expiry and status at read-time, not only via cron (Blueprint §24).
 */
export async function getQrByToken(token: string): Promise<FullQrData | null> {
  const [qrCode] = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.publicToken, token));

  if (!qrCode) return null;

  // Request-time expiry check (§24) — enforced on every request, not just cron
  if (qrCode.expiresAt && new Date(qrCode.expiresAt) <= new Date()) {
    if (qrCode.status === "active") {
      await db
        .update(qrCodes)
        .set({ status: "expired", updatedAt: new Date().toISOString() })
        .where(eq(qrCodes.id, qrCode.id));
    }
    return { qrCode: { ...qrCode, status: "expired" }, accessRules: null, currentVersion: null, files: [], textBody: null, targetUrl: null };
  }

  const [rules] = await db
    .select()
    .from(accessRules)
    .where(eq(accessRules.qrCodeId, qrCode.id));

  if (!qrCode.currentContentVersionId) {
    return { qrCode, accessRules: rules ?? null, currentVersion: null, files: [], textBody: null, targetUrl: null };
  }

  const [currentVersion] = await db
    .select()
    .from(contentVersions)
    .where(eq(contentVersions.id, qrCode.currentContentVersionId));

  const fileList = await db
    .select()
    .from(files)
    .where(eq(files.contentVersionId, qrCode.currentContentVersionId));

  const [text] = await db
    .select()
    .from(textContent)
    .where(eq(textContent.contentVersionId, qrCode.currentContentVersionId));

  const [url] = await db
    .select()
    .from(urlContent)
    .where(eq(urlContent.contentVersionId, qrCode.currentContentVersionId));

  return {
    qrCode,
    accessRules: rules ?? null,
    currentVersion: currentVersion ?? null,
    files: fileList,
    textBody: text?.body ?? null,
    targetUrl: url?.targetUrl ?? null,
  };
}

/**
 * Returns all QR codes for an owner.
 * Owner-scoped — always checks owner_id = current user (Blueprint §14).
 */
export async function getQrCodesByOwner(ownerId: string): Promise<QrCode[]> {
  return db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.ownerId, ownerId), eq(qrCodes.status, "active")))
    .orderBy(desc(qrCodes.createdAt));
}

/**
 * Gets single QR code verifying owner — prevents IDOR (Blueprint §14).
 */
export async function getQrCodeForOwner(
  qrId: string,
  ownerId: string
): Promise<QrCode | null> {
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, qrId), eq(qrCodes.ownerId, ownerId)));
  return qr ?? null;
}

/**
 * Owner-scoped variant of getQrByToken — loads the QR plus its current content
 * for the management UI. Unlike the resolver it does NOT flip status to expired
 * and does NOT hide content, so an owner can still fix an expired code.
 */
export async function getFullQrDataForOwner(
  qrId: string,
  ownerId: string
): Promise<FullQrData | null> {
  const qrCode = await getQrCodeForOwner(qrId, ownerId);
  if (!qrCode) return null;

  const [rules] = await db
    .select()
    .from(accessRules)
    .where(eq(accessRules.qrCodeId, qrCode.id));

  if (!qrCode.currentContentVersionId) {
    return {
      qrCode,
      accessRules: rules ?? null,
      currentVersion: null,
      files: [],
      textBody: null,
      targetUrl: null,
    };
  }

  const versionId = qrCode.currentContentVersionId;

  const [[currentVersion], fileList, [text], [url]] = await Promise.all([
    db.select().from(contentVersions).where(eq(contentVersions.id, versionId)),
    db.select().from(files).where(eq(files.contentVersionId, versionId)),
    db.select().from(textContent).where(eq(textContent.contentVersionId, versionId)),
    db.select().from(urlContent).where(eq(urlContent.contentVersionId, versionId)),
  ]);

  return {
    qrCode,
    accessRules: rules ?? null,
    currentVersion: currentVersion ?? null,
    files: fileList,
    textBody: text?.body ?? null,
    targetUrl: url?.targetUrl ?? null,
  };
}

/**
 * Sets or clears the viewer password for a QR code.
 * Passing null clears the password and reverts visibility to public.
 */
export async function setViewerPassword(
  qrId: string,
  ownerId: string,
  password: string | null
): Promise<void> {
  const existing = await getQrCodeForOwner(qrId, ownerId);
  if (!existing) throw new Error("QR code not found or not owned by user");

  await db
    .update(accessRules)
    .set({
      visibility: password ? "password" : "public",
      passwordHash: password ? await hashPassword(password) : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(accessRules.qrCodeId, qrId));

  await logAudit(
    ownerId,
    password ? "qr_code.password_set" : "qr_code.password_cleared",
    "qr_code",
    qrId
  );
}

/**
 * Replaces content behind a QR code.
 * Creates a new content_versions row and atomically updates the pointer.
 * The QR token/image is never changed — this is the entire replacement mechanism (Blueprint §21).
 */
export async function replaceQrContent(
  qrId: string,
  ownerId: string
): Promise<ContentVersion> {
  // Verify ownership before any mutation
  const existing = await getQrCodeForOwner(qrId, ownerId);
  if (!existing) throw new Error("QR code not found or not owned by user");

  // Mark previous version as not current
  if (existing.currentContentVersionId) {
    await db
      .update(contentVersions)
      .set({ isCurrent: false })
      .where(eq(contentVersions.id, existing.currentContentVersionId));
  }

  // Count existing versions for the version number
  const existingVersions = await db
    .select()
    .from(contentVersions)
    .where(eq(contentVersions.qrCodeId, qrId));

  const newVersionId = generateId();
  const newVersionNumber = existingVersions.length + 1;

  await db.insert(contentVersions).values({
    id: newVersionId,
    qrCodeId: qrId,
    versionNumber: newVersionNumber,
    isCurrent: true,
  });

  // Atomic pointer update — this is what makes dynamic QR replacement work
  await db
    .update(qrCodes)
    .set({
      currentContentVersionId: newVersionId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(qrCodes.id, qrId));

  await logAudit(ownerId, "qr_code.content_replaced", "qr_code", qrId, {
    newVersionId,
    versionNumber: newVersionNumber,
  });

  const [newVersion] = await db
    .select()
    .from(contentVersions)
    .where(eq(contentVersions.id, newVersionId));
  return newVersion;
}

/**
 * Soft-deletes a QR code. Background job handles permanent deletion.
 * Instant inaccessibility via the resolver (Blueprint §25).
 */
export async function softDeleteQrCode(qrId: string, ownerId: string): Promise<void> {
  const existing = await getQrCodeForOwner(qrId, ownerId);
  if (!existing) throw new Error("QR code not found or not owned by user");

  await db
    .update(qrCodes)
    .set({ status: "deleted", updatedAt: new Date().toISOString() })
    .where(and(eq(qrCodes.id, qrId), eq(qrCodes.ownerId, ownerId)));

  await logAudit(ownerId, "qr_code.soft_delete", "qr_code", qrId);
}

/**
 * Toggles a QR code between active and disabled.
 */
export async function setQrStatus(
  qrId: string,
  ownerId: string,
  status: "active" | "disabled"
): Promise<void> {
  const existing = await getQrCodeForOwner(qrId, ownerId);
  if (!existing) throw new Error("QR code not found or not owned by user");

  await db
    .update(qrCodes)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(qrCodes.id, qrId), eq(qrCodes.ownerId, ownerId)));

  await logAudit(ownerId, `qr_code.${status}`, "qr_code", qrId);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function recordScan(
  qrCodeId: string,
  opts: {
    country?: string;
    deviceType?: "mobile" | "tablet" | "desktop" | "unknown";
    browserFamily?: string;
    sessionHash?: string;
  }
): Promise<void> {
  await db.insert(qrScans).values({
    id: generateId(),
    qrCodeId,
    country: opts.country,
    deviceType: opts.deviceType ?? "unknown",
    browserFamily: opts.browserFamily,
    sessionHash: opts.sessionHash,
  });
}

export async function getScanCount(qrCodeId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(qrScans)
    .where(eq(qrScans.qrCodeId, qrCodeId));
  return Number(row?.count ?? 0);
}

/**
 * Batched scan counts for a list of QR codes — avoids an N+1 on the dashboard.
 */
export async function getScanCountsByQrIds(
  qrCodeIds: string[]
): Promise<Record<string, number>> {
  if (qrCodeIds.length === 0) return {};

  const rows = await db
    .select({ qrCodeId: qrScans.qrCodeId, count: sql<number>`count(*)` })
    .from(qrScans)
    .where(inArray(qrScans.qrCodeId, qrCodeIds))
    .groupBy(qrScans.qrCodeId);

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.qrCodeId] = Number(row.count);
  return counts;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function logAudit(
  actorUserId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.insert(auditLog).values({
    id: generateId(),
    actorUserId,
    action,
    targetType,
    targetId,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}
