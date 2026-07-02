import { describe, expect, it } from "vitest";
import { formString, getNextOrder, slugify } from "./admin-helpers";

describe("slugify", () => {
	it("lowercases, trims, and dashes separators", () => {
		expect(slugify("  Radha Krishna  ")).toBe("radha-krishna");
		expect(slugify("Sunset over the Ganges!")).toBe("sunset-over-the-ganges");
	});
	it("collapses runs of separators to a single dash and trims edges", () => {
		expect(slugify("a --- b // c")).toBe("a-b-c");
		expect(slugify("---edge---")).toBe("edge");
	});
	it("keeps Devanagari letters + matras (combining marks) intact", () => {
		// NFC-normalized Devanagari word must survive as a non-empty slug.
		const slug = slugify("सूर्यास्त");
		expect(slug.length).toBeGreaterThan(0);
		expect(slug).not.toContain("-"); // one word, no separators to collapse
	});
	it("strips emoji + variation-selector/ZWJ glue, leaving no trailing dash", () => {
		const slug = slugify("Peacock 🦚 art");
		expect(slug).toBe("peacock-art");
		expect(slug.endsWith("-")).toBe(false);
	});
	it("truncates to 64 chars without leaving a trailing dash", () => {
		const slug = slugify("a".repeat(70));
		expect(slug.length).toBeLessThanOrEqual(64);
		expect(slug.endsWith("-")).toBe(false);
	});
});

describe("getNextOrder", () => {
	it("returns max + 1", () => {
		expect(getNextOrder([{ order: 1 }, { order: 5 }, { order: 3 }])).toBe(6);
	});
	it("returns 1 for an empty list", () => {
		expect(getNextOrder([])).toBe(1);
	});
	it("handles a single row", () => {
		expect(getNextOrder([{ order: 9 }])).toBe(10);
	});
});

describe("formString", () => {
	it("returns a string field value", () => {
		const fd = new FormData();
		fd.set("title", "Hello");
		expect(formString(fd, "title")).toBe("Hello");
	});
	it("returns '' for a missing key", () => {
		expect(formString(new FormData(), "nope")).toBe("");
	});
	it("returns '' for a File value (not a string)", () => {
		const fd = new FormData();
		fd.set("image", new File(["x"], "a.jpg", { type: "image/jpeg" }));
		expect(formString(fd, "image")).toBe("");
	});
});
