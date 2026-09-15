import { describe, expect, it } from "vitest";
import {
	deriveStatus,
	getCtaCopy,
	isForSale,
	isPositivePrice,
	mostSaturatedSwatch,
} from "./catalog";

describe("isPositivePrice", () => {
	it("accepts a set positive number", () => {
		expect(isPositivePrice(12500)).toBe(true);
	});
	it("rejects undefined, zero, negative, and non-finite", () => {
		expect(isPositivePrice(undefined)).toBe(false);
		expect(isPositivePrice(0)).toBe(false);
		expect(isPositivePrice(-100)).toBe(false);
		expect(isPositivePrice(Number.NaN)).toBe(false);
		expect(isPositivePrice(Number.POSITIVE_INFINITY)).toBe(false);
	});
});

describe("deriveStatus", () => {
	it("keeps an explicit available/sold status", () => {
		expect(deriveStatus({ status: "available", priceInr: 500 })).toBe("available");
		expect(deriveStatus({ status: "sold", priceInr: 500 })).toBe("sold");
	});
	it("upgrades a priced archive row to available", () => {
		expect(deriveStatus({ status: "archive", priceInr: 500 })).toBe("available");
	});
	it("keeps an unpriced archive row as archive", () => {
		expect(deriveStatus({ status: "archive" })).toBe("archive");
		expect(deriveStatus({ status: "archive", priceInr: 0 })).toBe("archive");
	});
	it("falls back to price presence when status is missing", () => {
		expect(deriveStatus({ priceInr: 500 })).toBe("available");
		expect(deriveStatus({})).toBe("archive");
	});
	it("does NOT upgrade an archive row with a non-positive price (integrity guard)", () => {
		expect(deriveStatus({ status: "archive", priceInr: -1 })).toBe("archive");
	});
});

describe("isForSale (the store filter)", () => {
	it("is true only for a priced, unsold piece", () => {
		expect(isForSale({ status: "available", priceInr: 500 })).toBe(true);
		expect(isForSale({ priceInr: 500 })).toBe(true);
	});
	it("excludes a sold piece even if it still carries a price (integrity guard)", () => {
		expect(isForSale({ status: "sold", priceInr: 500 })).toBe(false);
	});
	it("excludes an 'available' piece with no real price (integrity guard)", () => {
		expect(isForSale({ status: "available" })).toBe(false);
		expect(isForSale({ status: "available", priceInr: 0 })).toBe(false);
	});
	it("excludes an unpriced archive piece", () => {
		expect(isForSale({ status: "archive" })).toBe(false);
	});
});

describe("getCtaCopy", () => {
	it("sold wins over available", () => {
		expect(getCtaCopy(true, true).label).toBe("Ask about a similar piece");
	});
	it("available (not sold) enquires on WhatsApp", () => {
		expect(getCtaCopy(true, false).label).toBe("Enquire on WhatsApp");
	});
	it("archive (not available, not sold) asks about the piece", () => {
		expect(getCtaCopy(false, false).label).toBe("Ask about this piece");
	});
	it("never emits a literal double dash in user-facing copy (house rule)", () => {
		for (const [avail, sold] of [
			[true, true],
			[true, false],
			[false, false],
		] as const) {
			const { label, note } = getCtaCopy(avail, sold);
			expect(label).not.toContain(" -- ");
			expect(note).not.toContain(" -- ");
		}
	});
});

describe("mostSaturatedSwatch (the lightbox glow)", () => {
	it("picks the highest-chroma swatch, not index 0", () => {
		// Near-white lead swatch must lose to the saturated red.
		expect(mostSaturatedSwatch(["#f5f0e8", "#c0392b", "#8a8680"])).toBe("#c0392b");
	});
	it("a pastel palette still yields its most coloured swatch, never a grey", () => {
		expect(mostSaturatedSwatch(["#d8d8d8", "#e8c8c8", "#c8d8e8"])).toBe("#e8c8c8");
	});
	it("supports 3-digit hex and a missing # prefix", () => {
		expect(mostSaturatedSwatch(["#abc", "f00"])).toBe("f00");
	});
	it("skips invalid entries and keeps valid ones", () => {
		expect(mostSaturatedSwatch(["not-a-colour", "#00ff00"])).toBe("#00ff00");
	});
	it("returns undefined for empty, missing or all-invalid palettes", () => {
		expect(mostSaturatedSwatch(undefined)).toBeUndefined();
		expect(mostSaturatedSwatch([])).toBeUndefined();
		expect(mostSaturatedSwatch(["nope", "#12"])).toBeUndefined();
	});
	it("a flat grey palette still returns a swatch (chroma 0 beats none)", () => {
		expect(mostSaturatedSwatch(["#888888", "#444444"])).toBe("#888888");
	});
});
