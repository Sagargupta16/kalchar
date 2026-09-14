/**
 * Tailwind classname merger -- the canonical shadcn/ui `cn()` helper.
 *
 * Combines `clsx` (conditional classes) with `tailwind-merge` (resolves
 * conflicting Tailwind utilities so `cn("p-2", isLarge && "p-6")` ends up
 * with just `p-6`).
 */
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's built-in font sizes, so it filed the
 * repo's own size tokens (text-h1, text-micro, ...) under text colour and
 * dropped one of the pair in `cn("text-micro", "text-muted")`. Registering
 * them as font sizes keeps size and colour independent, and lets a later
 * size win over an earlier one as expected.
 */
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			"font-size": [{ text: ["h1", "h2", "title", "h3", "label", "micro"] }],
		},
	},
});

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

const EVENT_DATE_LOCALE = "en-IN";

function formatIsoDate(iso: string, options: Intl.DateTimeFormatOptions): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString(EVENT_DATE_LOCALE, options);
}

/**
 * Format an ISO date string as a human-readable date (e.g. "12 March 2026").
 * Used for event dates. Returns "" for an empty/invalid input so callers can
 * gate on truthiness rather than guarding against "Invalid Date".
 */
export function formatEventDate(iso: string): string {
	return formatIsoDate(iso, { day: "numeric", month: "long", year: "numeric" });
}

/** Short form for narrow admin rows: "12 Mar 2026". Same guards as formatEventDate. */
export function formatEventDateShort(iso: string): string {
	return formatIsoDate(iso, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Format a rupee amount as "INR 12,500" (Indian digit grouping). One
 * authoritative price format for the gallery, store, lightbox, admin, and the
 * WhatsApp message, so the currency label and grouping never drift.
 */
export function formatInr(amount: number): string {
	return `INR ${amount.toLocaleString("en-IN")}`;
}

/** Human file size for upload previews: "840 KB", "5.2 MB". Never below 1 KB for a non-empty file. */
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const ROMAN_NUMERALS: readonly (readonly [number, string])[] = [
	[1000, "M"],
	[900, "CM"],
	[500, "D"],
	[400, "CD"],
	[100, "C"],
	[90, "XC"],
	[50, "L"],
	[40, "XL"],
	[10, "X"],
	[9, "IX"],
	[5, "V"],
	[4, "IV"],
	[1, "I"],
];

/**
 * Roman numeral for the workshop ledger rows (visual-direction 2.1/2.7):
 * 1 -> "I", 4 -> "IV". Returns "" for zero, negative or non-finite input so
 * callers can gate on truthiness.
 */
export function toRoman(value: number): string {
	if (!Number.isFinite(value) || value < 1) return "";
	let remainder = Math.floor(value);
	let out = "";
	for (const [figure, glyph] of ROMAN_NUMERALS) {
		while (remainder >= figure) {
			out += glyph;
			remainder -= figure;
		}
	}
	return out;
}
