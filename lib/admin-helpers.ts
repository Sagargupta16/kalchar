/**
 * Pure, dependency-free helpers for the admin flow.
 *
 * These were extracted from app/admin/_helpers.ts (which imports the Auth.js
 * session and so can't be imported in a plain test context) so the string/
 * number logic -- slug minting, order computation, form parsing -- can be
 * unit-tested without pulling in auth, Neon, or R2. The action files still
 * import from _helpers.ts, which re-exports these.
 */

/** Longest slug we mint; long titles truncate (uniqueness is checked on insert). */
export const SLUG_MAX_LENGTH = 64;

export function slugify(input: string): string {
	// Unicode-aware: keeps letters/digits in any script (Devanagari titles like
	// "sooryaast" make valid slugs -- URLs and R2 keys are UTF-8 safe), collapses
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

/** Read a FormData field as a string, defaulting to "" for missing/file values. */
export function formString(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value : "";
}
