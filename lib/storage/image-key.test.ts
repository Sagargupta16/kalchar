import { describe, expect, it } from "vitest";
import { slugify } from "../admin-helpers";
import { asciiKeySegment, FALLBACK_KEY_SEGMENT, isVersionedImageKey } from "./image-key";

const UUID = "3f8a1c2e-9b4d-4f7a-8e21-5c6d7b8a9f01";

describe("asciiKeySegment", () => {
	it.each([
		["सूर्यास्त", FALLBACK_KEY_SEGMENT],
		["Café Mural", "cafe-mural"],
		["Radha Krishna", "radha-krishna"],
		["Gond Tree of Birds 2", "gond-tree-of-birds-2"],
		["Mṛgayugma", "mrgayugma"],
		["सूर्यास्त 2026", "2026"],
		["Ｌｏｔｕｓ ﬁsh", "lotus-fish"],
	])("maps the slug of %j to the ASCII key segment %j", (title, expected) => {
		expect(asciiKeySegment(slugify(title))).toBe(expected);
	});

	it("leaves an already ASCII slug unchanged", () => {
		expect(asciiKeySegment("tree-with-elephants")).toBe("tree-with-elephants");
	});

	it("only emits lowercase letters, digits and inner hyphens within the length cap", () => {
		const segment = asciiKeySegment(`${"ä".repeat(70)}-tail`);
		expect(segment).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
		expect(segment.length).toBeLessThanOrEqual(64);
	});
});

describe("isVersionedImageKey", () => {
	it.each([
		`artworks/lotus-woman-${UUID}-400.avif`,
		`artworks/piece-${UUID}.jpg`,
		`events/${UUID}/photo-${UUID}-1600.webp`,
		`events/${UUID}/${UUID}-800.jpg`,
		`profile/artist-${UUID}-400.jpg`,
	])("treats the minted key %s as versioned", (key) => {
		expect(isVersionedImageKey(key)).toBe(true);
	});

	it.each([
		"artworks/radha-krishna-400.avif",
		"artworks/radha-krishna.jpg",
		`events/${UUID}/cover-400.webp`,
		`staging/${UUID}`,
		`artworks/lotus-${UUID}-400.png`,
	])("treats %s as unversioned", (key) => {
		expect(isVersionedImageKey(key)).toBe(false);
	});
});
