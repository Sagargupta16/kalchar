/**
 * Turso (libSQL) connection for the Phase 2 data seam.
 *
 * Reads TURSO_DATABASE_URL + TURSO_AUTH_TOKEN from the environment (see
 * .env.example). Imported only by lib/data.ts and server-side scripts -- never
 * from a client component, since it holds the auth token.
 *
 * The module-level singleton is fine on serverless: each warm Lambda/edge
 * instance reuses one client across invocations.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
	throw new Error("TURSO_DATABASE_URL is not set. See docs/PHASE-2-SETUP.md Part 1.");
}

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
