import path from "path";

/**
 * Test environment. Set before any `src/` module is imported, because
 * `src/db/index.ts` resolves DATABASE_URL at module scope — assigning it inside a
 * test would come too late and the suite would run against the dev database.
 */
process.env.DATABASE_URL = `file:${path.join(process.cwd(), ".test_db", "test.db")}`;

// 32+ chars so getSessionSecret() does not fall back to the dev secret. Tests that
// need to exercise the production guard stub this per-test with vi.stubEnv.
process.env.SESSION_SECRET =
  "test-only-session-secret-value-at-least-32-chars-long-abcdefgh";

process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

// The R2 driver is intentionally unimplemented; storage.ts throws if these are set.
delete process.env.R2_ACCOUNT_ID;
delete process.env.R2_ACCESS_KEY_ID;
delete process.env.R2_SECRET_ACCESS_KEY;
delete process.env.R2_BUCKET_NAME;
