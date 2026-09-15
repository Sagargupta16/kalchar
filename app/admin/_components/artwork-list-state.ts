import { artworkStatusLabel } from "@/lib/artwork-status";
import type { Artwork, ArtworkStatus } from "@/lib/types";

/** The five lenses over the Pieces list; `all` is the only one that allows reorder. */
export type PiecesFilter = "all" | "available" | "sold" | "archive" | "featured";

/** Grid (paintings-first, the phone default, D-A13) or list (the reorder and caption surface). */
export type PiecesView = "grid" | "list";

/** localStorage key for the view preference (a personal preference, so not a URL param). */
export const PIECES_VIEW_KEY = "kalchar:admin-pieces-view";

export function isPiecesView(value: unknown): value is PiecesView {
	return value === "grid" || value === "list";
}

/** Accessible name of a grid tile: title, position, featured flag and status in one sentence. */
export function tileLabel(art: Artwork, index: number): string {
	const status = artworkStatusLabel(art.status ?? "archive");
	return `Edit ${art.title}, position ${index + 1}${art.featured ? ", featured" : ""}, ${status}`;
}

export const PIECES_FILTERS: readonly PiecesFilter[] = [
	"all",
	"available",
	"sold",
	"archive",
	"featured",
];

export function isPiecesFilter(value: unknown): value is PiecesFilter {
	return typeof value === "string" && (PIECES_FILTERS as readonly string[]).includes(value);
}

/** Client-side match over the loaded rows: status chips compare the stored status, search covers title, category and medium. */
export function matchesFilter(art: Artwork, filter: PiecesFilter, query: string): boolean {
	if (filter === "featured" && !art.featured) return false;
	if (filter !== "all" && filter !== "featured" && (art.status ?? "archive") !== filter) {
		return false;
	}
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return [art.title, art.style, art.medium].some((field) => field.toLowerCase().includes(needle));
}

/** One list row: the piece plus its 400px admin thumbnail URL. */
export interface ArtworkListItem {
	art: Artwork;
	thumb: string;
}

/** Count the current rows, including optimistic changes that can still roll back. */
export function countPieces(items: readonly ArtworkListItem[]): Record<PiecesFilter, number> {
	const counts = { all: items.length, available: 0, sold: 0, archive: 0, featured: 0 };
	for (const { art } of items) {
		counts[art.status ?? "archive"] += 1;
		if (art.featured) counts.featured += 1;
	}
	return counts;
}

export type Patch = Partial<Pick<Artwork, "status" | "featured">>;
export type OptimisticPatch = Patch & { slug: string };
/** Where the shared hook's one `err` renders: the reorder bar, one row, or the undo bar. */
export type ErrorTarget = { kind: "list" } | { kind: "row"; slug: string } | { kind: "undo" };

/** Undo-bar line for each quick status, after the quoted title. */
export const STATUS_MESSAGE: Record<ArtworkStatus, string> = {
	sold: "marked as sold",
	available: "marked as available",
	archive: "marked not for sale",
};

/** Fresh rows in the staged order; rows unknown to the staged list append in server order, removed rows drop. */
export function applyStagedOrder(fresh: ArtworkListItem[], order: string[]): ArtworkListItem[] {
	const bySlug = new Map(fresh.map((item) => [item.art.slug, item]));
	const kept = order
		.map((slug) => bySlug.get(slug))
		.filter((item): item is ArtworkListItem => item !== undefined);
	const seen = new Set(order);
	return [...kept, ...fresh.filter((item) => !seen.has(item.art.slug))];
}

export function patchList(
	list: ArtworkListItem[],
	slug: string,
	patch: Partial<Artwork>,
): ArtworkListItem[] {
	return list.map((item) =>
		item.art.slug === slug ? { ...item, art: { ...item.art, ...patch } } : item,
	);
}
