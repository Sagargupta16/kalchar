import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
	assertUploadAllowed,
	MAX_IMAGE_BYTES,
	STAGING_PREFIX,
	stagingKey,
	validateImageBuffer,
} from "./image-upload";

describe("assertUploadAllowed", () => {
	it("accepts a supported non-empty upload", () => {
		expect(() => assertUploadAllowed("image/jpeg", 1024)).not.toThrow();
	});

	it("rejects unsupported MIME types before a ticket is issued", () => {
		expect(() => assertUploadAllowed("image/gif", 1024)).toThrow("JPEG, PNG, or WebP");
	});

	it("rejects oversized uploads before a ticket is issued", () => {
		expect(() => assertUploadAllowed("image/jpeg", MAX_IMAGE_BYTES + 1)).toThrow(
			"20 MB or smaller",
		);
	});

	it("rejects an empty upload", () => {
		expect(() => assertUploadAllowed("image/jpeg", 0)).toThrow("image file is required");
	});
});

describe("stagingKey", () => {
	it("confines staged masters to the staging prefix", () => {
		const key = stagingKey();
		expect(key.startsWith(STAGING_PREFIX)).toBe(true);
		expect(key).not.toBe(stagingKey());
	});
});

describe("validateImageBuffer", () => {
	it("accepts a decodable supported image", async () => {
		const image = await sharp({
			create: { width: 4, height: 3, channels: 3, background: "#a84f32" },
		})
			.jpeg()
			.toBuffer();

		await expect(validateImageBuffer(image)).resolves.toBeUndefined();
	});

	it("rejects supported decoders outside the upload format contract", async () => {
		const gif = await sharp({
			create: { width: 2, height: 2, channels: 3, background: "#a84f32" },
		})
			.gif()
			.toBuffer();

		await expect(validateImageBuffer(gif)).rejects.toThrow("JPEG, PNG, or WebP");
	});
});
