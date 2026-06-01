import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Use session-mode pooler (port 5432) for Drizzle CLI — transaction-mode
    // pooler (port 6543) hangs on schema introspection.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
});
