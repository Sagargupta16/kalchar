import { describe, expect, it } from "vitest";
import {
	ARTWORK_STATUS_OPTIONS,
	artworkStatusHelp,
	artworkStatusLabel,
	quickStateBlockedReason,
} from "./artwork-status";
import type { ArtworkStatus } from "./types";

describe("artwork status copy", () => {
	it("labels every status in plain words", () => {
		expect(ARTWORK_STATUS_OPTIONS).toEqual(["available", "sold", "archive"]);
		expect(ARTWORK_STATUS_OPTIONS.map(artworkStatusLabel)).toEqual([
			"Available",
			"Sold",
			"Not for sale",
		]);
		for (const status of ARTWORK_STATUS_OPTIONS) {
			expect(artworkStatusHelp(status)).toMatch(/^Shown in the gallery/);
		}
	});

	it("covers the whole ArtworkStatus union", () => {
		const every: Record<ArtworkStatus, true> = { available: true, sold: true, archive: true };
		expect(Object.keys(every).sort()).toEqual([...ARTWORK_STATUS_OPTIONS].sort());
	});
});

describe("quickStateBlockedReason", () => {
	it("blocks Not for sale on a priced piece, mirroring deriveStatus", () => {
		expect(quickStateBlockedReason("archive", 12000)).toMatch(/has a price/);
		expect(quickStateBlockedReason("archive", null)).toBeNull();
		expect(quickStateBlockedReason("archive", 0)).toBeNull();
	});

	it("advises, but does not block, Available without a price", () => {
		expect(quickStateBlockedReason("available", undefined)).toMatch(/No price yet/);
		expect(quickStateBlockedReason("available", 500)).toBeNull();
		expect(quickStateBlockedReason("sold", null)).toBeNull();
	});
});
