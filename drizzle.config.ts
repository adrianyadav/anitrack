import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit only loads .env by default; load .env.local for local dev
config();
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
