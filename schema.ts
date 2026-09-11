import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull().default(""),
  plan: text("plan", { enum: ["free", "pro", "business"] }).notNull().default("free"),
  emailVerifiedAt: text("email_verified_at"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── qr_codes ────────────────────────────────────────────────────────────────
export const qrCodes = pgTable("qr_codes", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  // 128+ bits of cryptographic randomness, never sequential, never predictabl
  publicToken: text("public_token").notNull().unique(),
  name: text("name").notNull().default(""),
  contentType: text("content_type", {
    enum: ["text", "url", "pdf", "image", "zip", "multi"],
  }).notNull(),
  status: text("status", {
    enum: ["active", "disabled", "deleted", "expired"],
  })
    .notNull()
    .default("active"),
  // Points to the current content_versions row — this is what makes dynamic replace
  currentContentVersionId: text("current_content_version_id"),
  expiresAt: text("expires_at"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── content_versions ────────────────────────────────────────────────────────
// The join table between qr_codes and their content.
// Inserting a new row + updating qr_codes.current_content_version_id IS the
// entire content-replacement mechanism (Blueprint §21).
export const contentVersions = pgTable("content_versions", {
  id: text("id").primaryKey(),
  qrCodeId: text("qr_code_id")
    .notNull()
    .references(() => qrCodes.id),
  versionNumber: integer("version_number").notNull().default(1),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── files ───────────────────────────────────────────────────────────────────
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  contentVersionId: text("content_version_id")
    .notNull()
    .references(() => contentVersions.id),
  // System-generated storage key — NEVER derived from user input (Blueprint §15)
  storageKey: text("storage_key").notNull(),
  // Original filename stored for display only, never used to build paths
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  checksum: text("checksum").notNull(),
  zipManifestJson: text("zip_manifest_json"), // JSON manifest for ZIP central directory
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── text_content ─────────────────────────────────────────────────────────────
export const textContent = pgTable("text_content", {
  id: text("id").primaryKey(),
  contentVersionId: text("content_version_id")
    .notNull()
    .references(() => contentVersions.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── url_content ──────────────────────────────────────────────────────────────
export const urlContent = pgTable("url_content", {
  id: text("id").primaryKey(),
  contentVersionId: text("content_version_id")
    .notNull()
    .references(() => contentVersions.id),
  targetUrl: text("target_url").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── access_rules ─────────────────────────────────────────────────────────────
// Argon2id / scrypt hash for viewer passwords. Never store plaintext (Blueprint §23).
export const accessRules = pgTable("access_rules", {
  id: text("id").primaryKey(),
  qrCodeId: text("qr_code_id")
    .notNull()
    .unique()
    .references(() => qrCodes.id),
  visibility: text("visibility", { enum: ["public", "password"] })
    .notNull()
    .default("public"),
  passwordHash: text("password_hash"), // scrypt hash only — never plaintext
  allowDownload: boolean("allow_download").notNull().default(true),
  viewOnly: boolean("view_only").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── qr_scans ────────────────────────────────────────────────────────────────
// Privacy-by-design: Raw IP is NEVER stored. Country derived and IP discarded.
// Session hash is salted + rotated daily, not reversible to an identity (Blueprint §16, §26).
export const qrScans = pgTable("qr_scans", {
  id: text("id").primaryKey(),
  qrCodeId: text("qr_code_id")
    .notNull()
    .references(() => qrCodes.id),
  scannedAt: timestamp("scanned_at", { mode: "string" }).notNull().defaultNow(),
  country: text("country"),
  deviceType: text("device_type", { enum: ["mobile", "tablet", "desktop", "unknown"] }),
  browserFamily: text("browser_family"),
  // Rotating daily salted hash — cannot be reversed to identity (§16)
  sessionHash: text("session_hash"),
});

// ─── password_attempts ────────────────────────────────────────────────────────
export const passwordAttempts = pgTable("password_attempts", {
  id: text("id").primaryKey(),
  qrCodeId: text("qr_code_id")
    .notNull()
    .references(() => qrCodes.id),
  ipHash: text("ip_hash").notNull(), // Privacy-safe hash of IP, not raw IP
  attemptedAt: timestamp("attempted_at", { mode: "string" }).notNull().defaultNow(),
  success: boolean("success").notNull().default(false),
});

// ─── subscriptions ───────────────────────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  plan: text("plan", { enum: ["free", "pro", "business"] }).notNull(),
  providerCustomerId: text("provider_customer_id"),
  status: text("status").notNull().default("active"),
  currentPeriodEnd: text("current_period_end"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── abuse_reports ───────────────────────────────────────────────────────────
// Public viewers can flag content. Reporter IP is hashed, never stored raw (§16).
export const abuseReports = pgTable("abuse_reports", {
  id: text("id").primaryKey(),
  qrCodeId: text("qr_code_id")
    .notNull()
    .references(() => qrCodes.id),
  reason: text("reason", {
    enum: ["illegal", "malware", "phishing", "copyright", "spam", "other"],
  }).notNull(),
  details: text("details"),
  reporterIpHash: text("reporter_ip_hash"),
  status: text("status", { enum: ["open", "reviewed", "actioned", "dismissed"] })
    .notNull()
    .default("open"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── audit_log ───────────────────────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── Type exports ─────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = typeof qrCodes.$inferInsert;
export type ContentVersion = typeof contentVersions.$inferSelect;
export type InsertContentVersion = typeof contentVersions.$inferInsert;
export type FileRecord = typeof files.$inferSelect;
export type InsertFileRecord = typeof files.$inferInsert;
export type TextContent = typeof textContent.$inferSelect;
export type UrlContent = typeof urlContent.$inferSelect;
export type AccessRules = typeof accessRules.$inferSelect;
export type QrScan = typeof qrScans.$inferSelect;
export type PasswordAttempt = typeof passwordAttempts.$inferSelect;
export type AbuseReport = typeof abuseReports.$inferSelect;
export type InsertAbuseReport = typeof abuseReports.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
