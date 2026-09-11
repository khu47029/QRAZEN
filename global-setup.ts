import path from "path";

/**
 * Runs once before any test file. Removes the previous test database so every run
 * starts from a known-empty schema — otherwise leftover rows from an earlier run
 * make ownership and counting assertions pass or fail for the wrong reasons.
 */
export async function setup() {
  const fs = await import("fs/promises");
  const dir = path.join(process.cwd(), ".test_db");
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });

  const store = path.join(process.cwd(), ".test_storage");
  await fs.rm(store, { recursive: true, force: true });
}
