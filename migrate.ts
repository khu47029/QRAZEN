import { db } from "./index";
import { sql } from "drizzle-orm";

async function applyMigrations(): Promise<void> {
  // Users table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      name TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free','pro','business')),
      email_verified_at TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  // QR codes table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      public_token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL
        CHECK (content_type IN ('text','url','pdf','image','zip','multi')),
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','disabled','deleted','expired')),
      current_content_version_id TEXT,
      expires_at TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_public_token
    ON qr_codes(public_token)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_qr_owner
    ON qr_codes(owner_id)
  `);

  // Content versions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS content_versions (
      id TEXT PRIMARY KEY,
      qr_code_id TEXT NOT NULL REFERENCES qr_codes(id),
      version_number INTEGER NOT NULL DEFAULT 1,
      is_current BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_cv_qr
    ON content_versions(qr_code_id)
  `);

  // Files table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      content_version_id TEXT NOT NULL REFERENCES content_versions(id),
      storage_key TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      checksum TEXT NOT NULL,
      zip_manifest_json TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_files_cv
    ON files(content_version_id)
  `);

  // Text content table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS text_content (
      id TEXT PRIMARY KEY,
      content_version_id TEXT NOT NULL REFERENCES content_versions(id),
      body TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  // URL content table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS url_content (
      id TEXT PRIMARY KEY,
      content_version_id TEXT NOT NULL REFERENCES content_versions(id),
      target_url TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  // Access rules table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS access_rules (
      id TEXT PRIMARY KEY,
      qr_code_id TEXT NOT NULL UNIQUE REFERENCES qr_codes(id),
      visibility TEXT NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public','password')),
      password_hash TEXT,
      allow_download BOOLEAN NOT NULL DEFAULT true,
      view_only BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  // QR scans table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS qr_scans (
      id TEXT PRIMARY KEY,
      qr_code_id TEXT NOT NULL REFERENCES qr_codes(id),
      scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      country TEXT,
      device_type TEXT
        CHECK (device_type IN ('mobile','tablet','desktop','unknown')),
      browser_family TEXT,
      session_hash TEXT
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_scans_qr_time
    ON qr_scans(qr_code_id, scanned_at)
  `);

  // Password attempts table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS password_attempts (
      id TEXT PRIMARY KEY,
      qr_code_id TEXT NOT NULL REFERENCES qr_codes(id),
      ip_hash TEXT NOT NULL,
      attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      success BOOLEAN NOT NULL DEFAULT false
    )
  `);

  // Subscriptions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      plan TEXT NOT NULL
        CHECK (plan IN ('free','pro','business')),
      provider_customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      current_period_end TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  // Abuse reports table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS abuse_reports (
      id TEXT PRIMARY KEY,
      qr_code_id TEXT NOT NULL REFERENCES qr_codes(id),
      reason TEXT NOT NULL
        CHECK (reason IN ('illegal','malware','phishing','copyright','spam','other')),
      details TEXT,
      reporter_ip_hash TEXT,
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','reviewed','actioned','dismissed')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_abuse_qr
    ON abuse_reports(qr_code_id)
  `);

  // Audit log table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  console.log("✅ Database migrations complete");
}

export const runMigrations = applyMigrations;
