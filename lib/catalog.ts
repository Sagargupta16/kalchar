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

/**
 * Resolve a piece's effective status.
 *
 * The DB stores status explicitly, but we keep a price-derived fallback so a
 * row left at the default "archive" resolves to "available" the moment a price
 * is set, without an extra admin step. A stored "archive" with a price is
 * likewise upgraded. An unknown/missing status falls back to price presence.
 */
export function deriveStatus(row: PricedPiece): ArtworkStatus {
	if (row.status === "available" || row.status === "sold" || row.status === "archive") {
		if (row.status === "archive" && isPositivePrice(row.priceInr)) return "available";
		return row.status;
	}
	return isPositivePrice(row.priceInr) ? "available" : "archive";
}

/** A price that actually advertises a sale: a set, positive, finite number. */
export function isPositivePrice(priceInr: number | null | undefined): priceInr is number {
	return typeof priceInr === "number" && Number.isFinite(priceInr) && priceInr > 0;
}

/**
 * For-sale = a positive price is set AND the piece has not been sold.
 *
 * Guards the "Available to buy" filter and count. Using the derived status (not
 * the raw column) means an unpriced piece can never leak into the buy filter,
 * and a sold piece is always excluded regardless of a stale price value.
 */
export function isForSale(piece: PricedPiece): boolean {
	return isPositivePrice(piece.priceInr) && deriveStatus(piece) !== "sold";
}

/** CTA label + supporting note, derived from the piece's availability state. */
export function getCtaCopy(isAvailable: boolean, isSold: boolean): { label: string; note: string } {
	if (isSold) {
		return {
			label: "Ask about a similar piece",
			note: "This piece has found a home. Reach out for a commission in the same style.",
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
		note: "Listed in the archive. Reach out if you'd like a similar piece commissioned.",
	};
}
