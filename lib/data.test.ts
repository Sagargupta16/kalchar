import { beforeEach, describe, expect, it, vi } from "vitest";

const fakes = vi.hoisted(() => ({ authorize: vi.fn() }));

// Fixture mode: the seam reads synthetic rows and the database client refuses access.
vi.mock("./env", () => ({ serverEnv: { testFixtures: true, adminPreview: false } }));
vi.mock("./admin-auth", () => ({ requireMaintainer: fakes.authorize }));

import { FIXTURE_HIDDEN_SLUG } from "./catalog-fixture";
import {
	getAdminArtworks,
	getAllArtworkSlugs,
	getAllArtworks,
	getArtworkBySlug,
	getArtworkFieldSuggestions,
	getArtworkTitles,
	getAvailableArtworks,
	getFeaturedArtwork,
	getStyleSamples,
} from "./data";

beforeEach(() => {
	vi.resetAllMocks();
	fakes.authorize.mockResolvedValue("maintainer@example.invalid");
});

describe("hidden pieces in the data seam", () => {
	it("keeps the hidden piece out of every public read", async () => {
		const all = await getAllArtworks();
		expect(all.length).toBeGreaterThan(0);
		expect(all.some((art) => art.slug === FIXTURE_HIDDEN_SLUG)).toBe(false);
		expect(all.every((art) => art.status !== "hidden")).toBe(true);
		expect(await getAllArtworkSlugs()).not.toContain(FIXTURE_HIDDEN_SLUG);
		expect(await getArtworkBySlug(FIXTURE_HIDDEN_SLUG)).toBeUndefined();
		expect((await getAvailableArtworks()).map((art) => art.slug)).not.toContain(
			FIXTURE_HIDDEN_SLUG,
		);
		expect((await getFeaturedArtwork())?.slug).not.toBe(FIXTURE_HIDDEN_SLUG);
		const samples = Object.values(await getStyleSamples()).map((sample) => sample.slug);
		expect(samples).not.toContain(FIXTURE_HIDDEN_SLUG);
		// Public reads never ask for a maintainer session.
		expect(fakes.authorize).not.toHaveBeenCalled();
	});

	it("still resolves public pieces by slug", async () => {
		const [first] = await getAllArtworks();
		expect(first).toBeDefined();
		expect((await getArtworkBySlug(first?.slug ?? ""))?.slug).toBe(first?.slug);
	});

	it("lists the hidden piece, priced but hidden, for a maintainer", async () => {
		const admin = await getAdminArtworks();
		const hidden = admin.find((art) => art.slug === FIXTURE_HIDDEN_SLUG);
		expect(hidden).toMatchObject({ status: "hidden", priceInr: 1500 });
		expect(admin).toHaveLength((await getAllArtworks()).length + 1);
		expect((await getArtworkTitles()).map((art) => art.slug)).toContain(FIXTURE_HIDDEN_SLUG);
		expect(fakes.authorize).toHaveBeenCalled();
	});

	it("refuses admin reads without a maintainer", async () => {
		fakes.authorize.mockRejectedValue(new Error("Not authorized."));
		await expect(getAdminArtworks()).rejects.toThrow("Not authorized.");
		await expect(getArtworkTitles()).rejects.toThrow("Not authorized.");
		await expect(getArtworkFieldSuggestions()).rejects.toThrow("Not authorized.");
	});
});
