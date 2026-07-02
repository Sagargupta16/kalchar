/**
 * Shared, server-only helpers for the admin server actions. Not a `"use server"`
 * module -- these are plain functions called internally by the action files
 * (actions.ts, event-actions.ts), not exposed as callable actions themselves.
 * Kept here so the action modules stay under the file-size ceiling and share one
 * authoritative copy of the auth gate + form parsing.
 */
import { type SQL, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { auth } from "@/auth";
import { isMaintainer } from "@/lib/maintainers";

// The pure string/number helpers (slugify, getNextOrder, formString) live in
// lib/admin-helpers.ts so they can be unit-tested without importing this
// module's Auth.js session. Re-exported here so the action files keep their
// existing "./_helpers" import path.
export { formString, getNextOrder, slugify } from "@/lib/admin-helpers";

/** Re-check the session and confirm the caller is a maintainer; returns their email. */
export async function requireMaintainer(): Promise<string> {
	const session = await auth();
	const email = session?.user?.email;
	if (!email || !(await isMaintainer(email))) {
		throw new Error("Not authorized.");
	}
	return email.toLowerCase();
}

/**
 * `max("order") + 1` computed inside the INSERT itself, so appending a row
 * doesn't read-then-write across two round-trips (the TOCTOU window where two
 * concurrent creates mint the same order). One statement, evaluated by
 * Postgres at insert time. Use this for creates; `getNextOrder` remains for
 * the preset flow, which needs the concrete number in JS for its id.
 */
export function nextOrderSql(table: PgTable): SQL<number> {
	return sql<number>`(select coalesce(max("order"), 0) + 1 from ${table})`;
}
