import sharp, { type Metadata } from "sharp";

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

/** Validate browser-provided upload metadata before buffering the file. */
export async function readImageUpload(file: File): Promise<Buffer> {
	if (file.size <= 0) throw new Error("An image file is required.");
	if (file.size > MAX_IMAGE_BYTES) {
		throw new Error(`Image must be ${MAX_IMAGE_BYTES / 1024 / 1024} MB or smaller.`);
	}
	if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
		throw new Error("Image must be a JPEG, PNG, or WebP file.");
	}
	return Buffer.from(await file.arrayBuffer());
}

/**
 * Decode enough metadata to reject disguised files and decompression bombs.
 * The same pixel limit is also passed to every sharp pipeline.
 */
export async function validateImageBuffer(buffer: Buffer): Promise<void> {
	let metadata: Metadata;
	try {
		metadata = await sharp(buffer, {
			failOn: "error",
			limitInputPixels: MAX_IMAGE_PIXELS,
		}).metadata();
	} catch {
		throw new Error("Image could not be decoded or exceeds the pixel limit.");
	}

	if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
		throw new Error("Image content must be JPEG, PNG, or WebP.");
	}
	if (!metadata.width || !metadata.height) {
		throw new Error("Image dimensions could not be read.");
	}
	if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
		throw new Error("Image dimensions are too large.");
	}
}
