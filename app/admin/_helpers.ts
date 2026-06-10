/**
 * Shared, server-only helpers for the admin server actions. Not a `"use server"`
 * module -- these are plain functions called internally by the action files
 * (actions.ts, event-actions.ts), not exposed as callable actions themselves.
 * Kept here so the action modules stay under the file-size ceiling and share one
 * authoritative copy of the auth gate + form parsing.
 */
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

export function slugify(input: string): string {
	// The first replace collapses every non-alphanumeric run to a single "-",
	// so a leading/trailing dash is always a lone character: matching one "-"
	// is enough (no "+", so the regex stays strictly linear).
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/** Next 1-based order value for appending a row after the current maximum. */
export function getNextOrder(rows: ReadonlyArray<{ order: number }>): number {
	return rows.reduce((max, row) => Math.max(max, row.order), 0) + 1;
}

/** Read a FormData field as a string, defaulting to "" for missing/file values. */
export function formString(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value : "";
}
