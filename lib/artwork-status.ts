/**
 * Plain-language copy for the three stored artwork statuses, shared by the admin
 * row chip, the quick-state sheet, the editor's Status select and (later) the
 * public status badge. Pure so it can be unit-tested and imported anywhere.
 */
import { isPositivePrice } from "./catalog";
import type { ArtworkStatus } from "./types";

export const ARTWORK_STATUS_OPTIONS: readonly ArtworkStatus[] = ["available", "sold", "archive"];

const LABEL: Record<ArtworkStatus, string> = {
	available: "Available",
	sold: "Sold",
	archive: "Not for sale",
};

/** One-line effect on the public site, shown under each option in the quick-state sheet. */
const HELP: Record<ArtworkStatus, string> = {
	available: "Shown in the gallery with its price and a buy button",
	sold: "Shown in the gallery with a Sold badge, no buy button",
	archive: "Shown in the gallery without a price",
};

export function artworkStatusLabel(status: ArtworkStatus): string {
	return LABEL[status];
}

export function artworkStatusHelp(status: ArtworkStatus): string {
	return HELP[status];
}

/**
 * Why a quick state cannot be applied from the row, or null when it can.
 * Mirrors lib/catalog.ts deriveStatus: a priced piece reads back as Available
 * even if "archive" is stored, so offering "Not for sale" would do nothing.
 * The "archive" reason blocks the option; the "available" reason is advisory.
 */
export function quickStateBlockedReason(
	status: ArtworkStatus,
	priceInr: number | null | undefined,
): string | null {
	if (status === "archive" && isPositivePrice(priceInr)) {
		return "This piece has a price, so it shows as Available. Remove the price in Edit to take it off sale.";
	}
	if (status === "available" && !isPositivePrice(priceInr)) {
		return "No price yet, so the gallery will not show a buy button. Add a price in Edit.";
	}
	return null;
}
