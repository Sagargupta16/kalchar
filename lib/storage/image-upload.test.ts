import { File as NodeFile } from "node:buffer";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES, readImageUpload, validateImageBuffer } from "./image-upload";

describe("readImageUpload", () => {
	it("accepts a supported non-empty file", async () => {
		const file = new NodeFile([Buffer.from("jpeg bytes")], "art.jpg", {
			type: "image/jpeg",
		}) as unknown as File;

		await expect(readImageUpload(file)).resolves.toEqual(Buffer.from("jpeg bytes"));
	});

	it("rejects unsupported MIME types before reading the file", async () => {
		const file = new NodeFile([Buffer.from("gif")], "art.gif", {
			type: "image/gif",
		}) as unknown as File;

		await expect(readImageUpload(file)).rejects.toThrow("JPEG, PNG, or WebP");
	});

	it("rejects oversized files before buffering them", async () => {
		const arrayBuffer = vi.fn();
		const file = {
			size: MAX_IMAGE_BYTES + 1,
			type: "image/jpeg",
			arrayBuffer,
		} as unknown as File;

		await expect(readImageUpload(file)).rejects.toThrow("20 MB or smaller");
		expect(arrayBuffer).not.toHaveBeenCalled();
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
