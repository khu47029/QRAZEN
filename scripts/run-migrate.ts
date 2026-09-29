import dotenv from "dotenv";
dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  console.log("🚀 Standalone database migration runner");

  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not defined.");
    console.error("Please set DATABASE_URL to your PostgreSQL database connection string (e.g. Supabase).");
    process.exit(1);
  }

  if (dbUrl.startsWith("file:")) {
    console.error("❌ ERROR: DATABASE_URL is configured as a local file ('file:...'), but QRAZEN uses PostgreSQL (Supabase).");
    console.error("Please provide a valid PostgreSQL connection string in DATABASE_URL.");
    process.exit(1);
  }

  try {
    const { runMigrations } = await import("../src/db/migrate");
    await runMigrations();
    console.log("🎉 Database migrations applied successfully!");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Database migration failed:", err?.message || err);
    process.exit(1);
  }
}

main();
