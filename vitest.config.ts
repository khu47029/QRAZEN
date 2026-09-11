import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    // The integration tests share one SQLite file. Forks + sequential files keeps
    // writers serialised so a failure is a real failure, not lock contention.
    pool: "forks",
    fileParallelism: false,
    // scrypt is deliberately expensive (N=16384); a few hashes per file adds up.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
