/**
 * Neon (Postgres) connection for the Phase 2 data seam.
 *
 * Reads DATABASE_URL from the environment (see .env.example). Imported only by
 * lib/data.ts and server-side scripts -- never from a client component, since
 * the connection string holds credentials.
 *
 * Uses the neon-http driver: fastest for single, non-interactive queries,
 * which is exactly the gallery's read pattern. The module-level singleton is
 * fine on serverless -- each warm Lambda/edge instance reuses one client.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
	throw new Error("DATABASE_URL is not set. See docs/PHASE-2-SETUP.md Part 1.");
}

const sql = neon(url);

export const db = drizzle({ client: sql, schema });
