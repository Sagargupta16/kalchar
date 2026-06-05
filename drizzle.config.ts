/**
 * Drizzle Kit config for the Neon (Postgres) catalog DB.
 *
 * Usage (after env vars are set, see docs/PHASE-2-SETUP.md):
 *   pnpm db:push       # push schema straight to the DB (rapid dev)
 *   pnpm db:generate   # emit SQL migration files under ./drizzle
 *   pnpm db:migrate    # apply generated migrations
 */
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads .env.local automatically, but drizzle-kit does not -- load it
// explicitly so `pnpm db:*` picks up DATABASE_URL from the same file the app uses.
config({ path: ".env.local" });

export default defineConfig({
	out: "./drizzle",
	schema: "./lib/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL as string,
	},
});
