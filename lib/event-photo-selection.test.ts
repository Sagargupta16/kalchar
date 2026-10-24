import { describe, expect, it } from "vitest";
import { processInParallel } from "./event-photo-batch";
import {
	bySelection,
	describeFailedPhotos,
	mergePhotoFiles,
	photoFileKey,
} from "./event-photo-selection";

const picked = (name: string, size = 10, lastModified = 1) => ({ name, size, lastModified });

describe("mergePhotoFiles", () => {
	it("adds a second pick after the first instead of replacing it", () => {
		const first = [picked("a.jpg"), picked("b.jpg")];
		const second = [picked("c.jpg")];
		expect(mergePhotoFiles(first, second).map((file) => file.name)).toEqual([
			"a.jpg",
			"b.jpg",
			"c.jpg",
		]);
	});

	it("skips a photo picked again, keeping the object already selected", () => {
		const a = picked("a.jpg");
		const merged = mergePhotoFiles([a], [picked("a.jpg"), picked("b.jpg")]);
		expect(merged).toHaveLength(2);
		expect(merged[0]).toBe(a);
	});

	it("keeps photos that only share a name", () => {
		const merged = mergePhotoFiles([picked("IMG.jpg", 10, 1)], [picked("IMG.jpg", 20, 1)]);
		expect(merged).toHaveLength(2);
		expect(photoFileKey(merged[0]!)).not.toBe(photoFileKey(merged[1]!));
	});

	it("dedupes within one pick and leaves the inputs untouched", () => {
		const current = [picked("a.jpg")];
		const merged = mergePhotoFiles(current, [picked("b.jpg"), picked("b.jpg")]);
		expect(merged.map((file) => file.name)).toEqual(["a.jpg", "b.jpg"]);
		expect(current).toHaveLength(1);
	});
});

describe("bySelection", () => {
	it("maps successes and failures over part of the selection back to selection indexes", async () => {
		// Selection indexes 0, 2 and 3 were staged; the photo at index 2 fails processing.
		const outcome = await processInParallel(["k0", "k2", "k3"], async (key) =>
			key === "k2" ? { ok: false, message: "Unreadable." } : { ok: true, keyBase: `base-${key}` },
		);
		expect(bySelection([0, 2, 3], outcome)).toEqual({
			done: [
				{ index: 0, key: "base-k0" },
				{ index: 3, key: "base-k3" },
			],
			failures: [{ index: 2, message: "Unreadable." }],
		});
	});

	it("handles an empty batch", () => {
		expect(bySelection([], { total: 0, keyBases: [], failures: [] })).toEqual({
			done: [],
			failures: [],
		});
	});
});

describe("describeFailedPhotos", () => {
	const files = [{ name: "a.jpg" }, { name: "b.jpg" }, { name: "c.jpg" }];

	it("is null when every photo was saved", () => {
		expect(describeFailedPhotos(files, 3, [], true)).toBeNull();
	});

	it("names each failed photo and says it is still selected for another upload", () => {
		expect(
			describeFailedPhotos(files, 2, [{ index: 1, message: "That photo could not be read" }], true),
		).toBe(
			'Saved 2 of 3 photos. "b.jpg" failed: That photo could not be read. It is still selected below. Choose Upload photos to send it again.',
		);
	});

	it("does not repeat a name the upload error already quotes", () => {
		const message = 'Upload of "a.jpg" failed. Check the connection and try again.';
		expect(describeFailedPhotos(files, 1, [{ index: 0, message }], false)).toBe(
			`Saved 1 of 3 photos. ${message} Select that photo and add it again.`,
		);
	});

	it("counts several failures and falls back to a generic reason", () => {
		expect(
			describeFailedPhotos(
				files,
				1,
				[
					{ index: 0, message: "" },
					{ index: 2, message: "Upload expired." },
				],
				false,
			),
		).toBe(
			'Saved 1 of 3 photos. "a.jpg" failed: Something went wrong. Please try again. "c.jpg" failed: Upload expired. Select those 2 photos and add them again.',
		);
	});
});
