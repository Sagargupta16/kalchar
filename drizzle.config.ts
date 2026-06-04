/**
 * Drizzle Kit config for the Turso (libSQL) catalog DB.
 *
 * Usage (after env vars are set, see docs/PHASE-2-SETUP.md):
 *   pnpm drizzle-kit push       # push schema straight to the DB (rapid dev)
 *   pnpm drizzle-kit generate   # emit SQL migration files under ./drizzle
 *   pnpm drizzle-kit migrate    # apply generated migrations
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./lib/db/schema.ts",
	dialect: "turso",
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL as string,
		authToken: process.env.TURSO_AUTH_TOKEN,
	},
});
