/**
 * Drizzle Kit config for the Neon (Postgres) catalog DB.
 *
 * Usage (after env vars are set, see docs/PHASE-2-SETUP.md):
 *   pnpm db:push       # push schema straight to the DB (rapid dev)
 *   pnpm db:generate   # emit SQL migration files under ./drizzle
 *   pnpm db:migrate    # apply generated migrations
 */
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./lib/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL as string,
	},
});
