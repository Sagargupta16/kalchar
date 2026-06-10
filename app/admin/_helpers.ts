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

/** Re-check the session and confirm the caller is a maintainer; returns their email. */
export async function requireMaintainer(): Promise<string> {
	const session = await auth();
	const email = session?.user?.email;
	if (!email || !(await isMaintainer(email))) {
		throw new Error("Not authorized.");
	}
	return email.toLowerCase();
}

/** Longest slug we mint; long titles truncate (uniqueness is checked on insert). */
const SLUG_MAX_LENGTH = 64;

export function slugify(input: string): string {
	// Unicode-aware: keeps letters/digits in any script (Devanagari titles like
	// "सूर्यास्त" make valid slugs -- URLs and R2 keys are UTF-8 safe), collapses
	// everything else to single dashes. \p{Mark} is required alongside
	// \p{Letter}: Devanagari vowel signs (matras) and the virama are combining
	// marks, and dropping them would shred the word. The collapse means a
	// leading/trailing dash is always a lone character, so the trim regex needs
	// no "+" and stays strictly linear. NFC-normalize first so visually
	// identical Devanagari (precomposed vs combining) yields one canonical slug.
	return (
		input
			.normalize("NFC")
			.toLowerCase()
			.trim()
			// Emoji glue (variation selectors U+FE00-FE0F, zero-width joiner) are
			// Marks that would otherwise survive after their emoji base is stripped.
			.replace(/[\ufe00-\ufe0f\u200d]/gu, "")
			.replace(/[^\p{Letter}\p{Mark}\p{Number}]+/gu, "-")
			.replace(/^-|-$/g, "")
			.slice(0, SLUG_MAX_LENGTH)
			.replace(/-$/, "")
	);
}

/** Next 1-based order value for appending a row after the current maximum. */
export function getNextOrder(rows: ReadonlyArray<{ order: number }>): number {
	return rows.reduce((max, row) => Math.max(max, row.order), 0) + 1;
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

/** Read a FormData field as a string, defaulting to "" for missing/file values. */
export function formString(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value : "";
}
