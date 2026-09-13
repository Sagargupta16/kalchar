import type { Artwork, ArtworkStatus } from "@/lib/types";

/** The five lenses over the Pieces list; `all` is the only one that allows reorder. */
export type PiecesFilter = "all" | "available" | "sold" | "archive" | "featured";

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
