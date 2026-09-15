import type { Artwork } from "./types";

/** Featured pieces shown under the hero (the hero front plate is excluded). */
export const SELECTED_WORK_COUNT = 6;
/** For-sale pieces previewed on the home page: a clean 2x2 on the phone grid. */
export const AVAILABLE_PREVIEW_COUNT = 4;

export interface HomeCatalogInput {
	all: readonly Artwork[];
	available: readonly Artwork[];
	featured: Artwork | undefined;
}

export interface HomeCatalog {
	selected: Artwork[];
	availablePreview: Artwork[];
	heroPool: readonly Artwork[];
	heroSecondary: Artwork | undefined;
	/** slug -> catalog position, for the hero "N of M" caption. */
	catalogIndex: Record<string, number>;
	selectedCtaLabel: string;
	availableCtaLabel: string;
}

/**
 * Shapes the fetched catalog for the home page so a piece never renders twice
 * in the static grids: a featured piece that is also for sale lives in
 * Selected work only. The hero is a rotating spotlight (it shuffles after
 * paint), so it does NOT count as a home for a for-sale piece; the Available
 * preview is deduped against Selected only.
 */
export function shapeHomeCatalog({ all, available, featured }: HomeCatalogInput): HomeCatalog {
	const selected = all
		.filter((art) => art.featured && art.slug !== featured?.slug)
		.slice(0, SELECTED_WORK_COUNT);
	const selectedSlugs = new Set(selected.map((art) => art.slug));
	const availablePreview = available
		.filter((art) => !selectedSlugs.has(art.slug))
		.slice(0, AVAILABLE_PREVIEW_COUNT);

	// Keep at least two pieces in the hero pool so the layered composition never
	// collapses when only one catalog row is marked featured (MEMORY.md).
	const heroSource = all.filter((art) => art.featured);
	const heroPool = heroSource.length >= 2 ? heroSource : all;
	const heroSecondary = heroPool.find((art) => art.slug !== featured?.slug);

	const catalogIndex: Record<string, number> = {};
	all.forEach((art, i) => {
		catalogIndex[art.slug] = i;
	});

	const forSale = available.length;
	const selectedCtaLabel =
		availablePreview.length === 0 && forSale > 0
			? `See all work (${forSale} for sale)`
			: "See all work";
	const availableCtaLabel =
		forSale === 1 ? "See the piece for sale" : `See all ${forSale} for sale`;

	return {
		selected,
		availablePreview,
		heroPool,
		heroSecondary,
		catalogIndex,
		selectedCtaLabel,
		availableCtaLabel,
	};
}
