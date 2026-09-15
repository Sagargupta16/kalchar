import { describe, expect, it } from "vitest";
import { AVAILABLE_PREVIEW_COUNT, SELECTED_WORK_COUNT, shapeHomeCatalog } from "./home-catalog";
import type { Artwork } from "./types";

function piece(slug: string, featured = false, priceInr?: number): Artwork {
	return {
		slug,
		title: slug,
		style: "Madhubani",
		medium: "Acrylic",
		aspectRatio: 0.75,
		featured,
		order: 0,
		image: `${slug}.jpg`,
		priceInr,
		status: priceInr ? "available" : "archive",
	};
}

describe("shapeHomeCatalog", () => {
	it("caps Selected at SELECTED_WORK_COUNT and excludes the hero", () => {
		const all = Array.from({ length: 9 }, (_, i) => piece(`p${i}`, true));
		const out = shapeHomeCatalog({ all, available: [], featured: all[0] });
		expect(out.selected).toHaveLength(SELECTED_WORK_COUNT);
		expect(out.selected.map((a) => a.slug)).not.toContain("p0");
	});

	it("dedupes Available against Selected and caps at AVAILABLE_PREVIEW_COUNT", () => {
		const featuredForSale = piece("f1", true, 1000);
		const all = [
			piece("hero", true),
			featuredForSale,
			...Array.from({ length: 6 }, (_, i) => piece(`s${i}`, false, 500)),
		];
		const available = all.filter((a) => a.priceInr);
		const out = shapeHomeCatalog({ all, available, featured: all[0] });
		expect(out.availablePreview.map((a) => a.slug)).not.toContain("f1");
		expect(out.availablePreview).toHaveLength(AVAILABLE_PREVIEW_COUNT);
	});

	it("keeps a for-sale hero piece in Available (the hero shuffles, so it is not a stable home)", () => {
		const hero = piece("hero", true, 1000);
		const all = [hero, piece("b", true)];
		const out = shapeHomeCatalog({ all, available: [hero], featured: hero });
		expect(out.availablePreview.map((a) => a.slug)).toEqual(["hero"]);
		expect(out.availableCtaLabel).toBe("See the piece for sale");
		expect(out.selectedCtaLabel).toBe("See all work");
	});

	it("folds the for-sale count into the Selected CTA when Available would be empty", () => {
		const a = piece("a", true, 1000);
		const b = piece("b", true, 2000);
		const all = [piece("hero", true), a, b];
		const out = shapeHomeCatalog({ all, available: [a, b], featured: all[0] });
		expect(out.availablePreview).toHaveLength(0);
		expect(out.selectedCtaLabel).toBe("See all work (2 for sale)");
		expect(out.availableCtaLabel).toBe("See all 2 for sale");
	});

	it("falls back to the whole catalog for the hero pool when fewer than two pieces are featured", () => {
		const all = [piece("only", true), piece("x"), piece("y")];
		const out = shapeHomeCatalog({ all, available: [], featured: all[0] });
		expect(out.heroPool).toBe(all);
		expect(out.heroSecondary?.slug).toBe("x");
		expect(out.catalogIndex).toEqual({ only: 0, x: 1, y: 2 });
	});

	it("is safe on an empty catalog", () => {
		const out = shapeHomeCatalog({ all: [], available: [], featured: undefined });
		expect(out.selected).toEqual([]);
		expect(out.availablePreview).toEqual([]);
		expect(out.heroSecondary).toBeUndefined();
		expect(out.selectedCtaLabel).toBe("See all work");
	});
});
