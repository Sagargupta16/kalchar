/**
 * Pure catalog logic -- the "store is a filter" rules, dependency-free.
 *
 * These functions decide a piece's lifecycle status and whether it's for sale,
 * and the enquiry CTA copy that follows from that. They live here (not inside
 * the data seam or a page/client component) so the SAME rule is used by the
 * seam (lib/data.ts), the gallery filter (work-filter.tsx), and the detail page
 * -- one source of truth for "available means priced and not sold" -- and so
 * they can be unit-tested without pulling in Neon, R2, or Next.
 */
import type { ArtworkStatus } from "./types";

/**
 * Minimal shape the status/for-sale rules need. `status` is a loose `string`
 * (not the narrow `ArtworkStatus`) so a raw DB row -- whose `status` text column
 * types as `string` -- satisfies it directly; `deriveStatus` validates the
 * value against the known set internally.
 */
export interface PricedPiece {
	status?: string | null;
	priceInr?: number | null;
}

const STORED_STATUSES: ReadonlySet<string> = new Set<ArtworkStatus>([
	"archive",
	"available",
	"sold",
	"hidden",
]);

function isStoredStatus(status: string | null | undefined): status is ArtworkStatus {
	return typeof status === "string" && STORED_STATUSES.has(status);
}

/**
 * Resolve a piece's effective status.
 *
 * The DB stores status explicitly, but we keep a price-derived fallback so a
 * row left at the default "archive" resolves to "available" the moment a price
 * is set, without an extra admin step. A stored "archive" with a price is
 * likewise upgraded. "hidden" always stays hidden, priced or not. An
 * unknown/missing status falls back to price presence.
 */
export function deriveStatus(row: PricedPiece): ArtworkStatus {
	if (isStoredStatus(row.status)) {
		if (row.status === "archive" && isPositivePrice(row.priceInr)) return "available";
		return row.status;
	}
	return isPositivePrice(row.priceInr) ? "available" : "archive";
}

/** Hidden pieces stay in the admin; every public read drops them. */
export function isPubliclyVisible(piece: PricedPiece): boolean {
	return deriveStatus(piece) !== "hidden";
}

/** A price that actually advertises a sale: a set, positive, finite number. */
export function isPositivePrice(priceInr: number | null | undefined): priceInr is number {
	return typeof priceInr === "number" && Number.isFinite(priceInr) && priceInr > 0;
}

/**
 * For-sale = a positive price is set AND the piece resolves to Available.
 *
 * Guards the "Available to buy" filter and count. Using the derived status (not
 * the raw column) means an unpriced piece can never leak into the buy filter,
 * and a sold or hidden piece is always excluded regardless of a price value.
 */
export function isForSale(piece: PricedPiece): boolean {
	return isPositivePrice(piece.priceInr) && deriveStatus(piece) === "available";
}

/** CTA label + supporting note, derived from the piece's availability state. */
export function getCtaCopy(isAvailable: boolean, isSold: boolean): { label: string; note: string } {
	if (isSold) {
		return {
			label: "Ask about a similar piece",
			note: "This piece has found a home. Reach out to order a custom piece in the same style.",
		};
	}
	if (isAvailable) {
		return {
			label: "Enquire on WhatsApp",
			note: "Tap to open a pre-filled WhatsApp message. Ships from India.",
		};
	}
	return {
		label: "Ask about this piece",
		note: "Listed in the archive. Reach out if you'd like a similar custom piece.",
	};
}

/**
 * The first free slug for a new piece: the title's own slug while nobody holds
 * it, else one past the highest numeric suffix in use, so a repeated title like
 * "Fish" becomes fish, fish-2, fish-3. Going past the highest (not filling a
 * gap) keeps a deleted piece's old address from pointing at a different
 * painting. `taken` only needs the slugs that share the prefix; others such as
 * "fish-family" are ignored because their suffix is not a number.
 */
export function uniqueArtworkSlug(base: string, taken: Iterable<string>): string {
	const used = new Set(taken);
	if (!used.has(base)) return base;
	const prefix = `${base}-`;
	let highest = 1;
	for (const slug of used) {
		if (!slug.startsWith(prefix)) continue;
		const suffix = slug.slice(prefix.length);
		if (!/^[1-9]\d*$/.test(suffix)) continue;
		const value = Number(suffix);
		if (Number.isSafeInteger(value) && value > highest) highest = value;
	}
	return `${prefix}${highest + 1}`;
}

/** Parse a 3- or 6-digit hex colour (with or without #) to [r, g, b] 0-255. */
function parseHexRgb(swatch: string): [number, number, number] | null {
	const hex = swatch.trim().replace(/^#/, "");
	if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) return null;
	const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
	return [
		Number.parseInt(full.slice(0, 2), 16),
		Number.parseInt(full.slice(2, 4), 16),
		Number.parseInt(full.slice(4, 6), 16),
	];
}

/**
 * The palette swatch with the highest chroma, for the lightbox plate glow
 * (visual-direction 2.4). Sorting by chroma -- max minus min RGB channel, the
 * HSL chroma -- rather than taking index 0 keeps a pastel or near-white lead
 * swatch from washing the glow grey. Invalid entries are skipped; an empty,
 * missing or all-invalid palette returns undefined so the CSS fallback
 * (--plate-glow: the shadow ink) takes over.
 */
export function mostSaturatedSwatch(palette: readonly string[] | undefined): string | undefined {
	if (!palette || palette.length === 0) return undefined;
	let best: string | undefined;
	let bestChroma = -1;
	for (const swatch of palette) {
		const rgb = parseHexRgb(swatch);
		if (!rgb) continue;
		const chroma = Math.max(...rgb) - Math.min(...rgb);
		if (chroma > bestChroma) {
			bestChroma = chroma;
			best = swatch;
		}
	}
	return best;
}
