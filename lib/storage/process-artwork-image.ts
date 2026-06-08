/**
 * Process an uploaded artwork image into the full responsive variant set, then
 * upload all variants to R2 under `artworks/<slug>...`. Server-only (sharp +
 * R2 keys). Shared by the admin upload action and the `pnpm db:images` script.
 *
 * Output keys match the ARTWORK_IMAGE_BASE contract exactly:
 *   artworks/<slug>-<w>.avif|webp|jpg  (w in 400/800/1200/1600)
 *   artworks/<slug>.jpg                (master-width mozjpeg fallback)
 * so the gallery's <picture> srcset resolves with no per-image bookkeeping.
 *
 * Returns the natural aspect ratio (width/height) of the source so the caller
 * can store it on the artwork row for layout.
 */
import sharp from "sharp";
import { deleteObjects, uploadObject } from "./r2";

const WIDTHS = [400, 800, 1200, 1600] as const;
const AVIF_OPTS = { quality: 60, effort: 4, chromaSubsampling: "4:2:0" } as const;
const WEBP_OPTS = { quality: 72, effort: 4 } as const;
const JPEG_OPTS = { quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" } as const;

export interface ProcessedImage {
	/** R2 object keys written (for rollback / bookkeeping). */
	keys: string[];
	/** Natural width/height of the source. */
	aspectRatio: number;
	/** Sampled dominant colors (hex), 3-5 entries, for the chromacard. */
	palette: string[];
}

const toHex = (n: number) => n.toString(16).padStart(2, "0");

/**
 * Sample a small palette of dominant colors from an image buffer.
 *
 * Resizes to a tiny grid so sharp averages each region, reads the raw RGB
 * pixels, then greedily picks the most visually distinct swatches (skipping
 * near-duplicates and near-white/near-black noise). No k-means dependency --
 * the downscale does the clustering for us. Returns 3-5 hex strings.
 */
// Manhattan-distance thresholds (0-765) for treating two sampled colors as
// distinct. The first pass demands clear separation; the fallback relaxes it
// so very flat images still yield 3 swatches.
const DISTINCT_COLOR_DISTANCE = 60;
const FALLBACK_COLOR_DISTANCE = 20;
const PALETTE_SAMPLE_GRID = 8;
const MIN_PALETTE_SIZE = 3;

export async function extractPalette(master: Buffer, count = 5): Promise<string[]> {
	const { data } = await sharp(master, { failOn: "none" })
		.rotate()
		.resize(PALETTE_SAMPLE_GRID, PALETTE_SAMPLE_GRID, { fit: "fill" })
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const pixels: Array<[number, number, number]> = [];
	for (let i = 0; i + 2 < data.length; i += 3) {
		pixels.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]);
	}

	const dist = (a: [number, number, number], b: [number, number, number]) =>
		Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

	// Sort by saturation*brightness so vivid colors win over muddy averages.
	const score = ([r, g, b]: [number, number, number]) => {
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		return max - min + max * 0.3;
	};
	const ranked = [...pixels].sort((a, b) => score(b) - score(a));

	const chosen: Array<[number, number, number]> = [];
	for (const px of ranked) {
		if (chosen.every((c) => dist(c, px) > DISTINCT_COLOR_DISTANCE)) chosen.push(px);
		if (chosen.length >= count) break;
	}
	// Fallback if the image is very flat: take whatever distinct pixels exist.
	if (chosen.length < MIN_PALETTE_SIZE) {
		for (const px of pixels) {
			if (chosen.every((c) => dist(c, px) > FALLBACK_COLOR_DISTANCE)) chosen.push(px);
			if (chosen.length >= MIN_PALETTE_SIZE) break;
		}
	}

	return chosen.map(([r, g, b]) => `#${toHex(r)}${toHex(g)}${toHex(b)}`);
}

/** Generate + upload all variants for one master image buffer. */
export async function processArtworkImage(slug: string, master: Buffer): Promise<ProcessedImage> {
	const base = sharp(master, { failOn: "none" }).rotate().withMetadata({ orientation: undefined });
	const meta = await base.metadata();
	const aspectRatio = meta.width && meta.height ? meta.width / meta.height : 0.75;

	const keys: string[] = [];

	const put = async (key: string, buf: Buffer, type: string) => {
		await uploadObject(`artworks/${key}`, buf, type);
		keys.push(`artworks/${key}`);
	};

	for (const w of WIDTHS) {
		const resized = sharp(master, { failOn: "none" })
			.rotate()
			.withMetadata({ orientation: undefined })
			.resize({ width: w, withoutEnlargement: true });
		const [avif, webp, jpg] = await Promise.all([
			resized.clone().avif(AVIF_OPTS).toBuffer(),
			resized.clone().webp(WEBP_OPTS).toBuffer(),
			resized.clone().jpeg(JPEG_OPTS).toBuffer(),
		]);
		await put(`${slug}-${w}.avif`, avif, "image/avif");
		await put(`${slug}-${w}.webp`, webp, "image/webp");
		await put(`${slug}-${w}.jpg`, jpg, "image/jpeg");
	}

	// Master-width mozjpeg fallback (the bare <img src>).
	const masterJpg = await sharp(master, { failOn: "none" })
		.rotate()
		.withMetadata({ orientation: undefined })
		.jpeg(JPEG_OPTS)
		.toBuffer();
	await put(`${slug}.jpg`, masterJpg, "image/jpeg");

	const palette = await extractPalette(master);

	return { keys, aspectRatio, palette };
}

/** Remove every variant for a slug from R2 (used when deleting an artwork). */
export async function deleteArtworkImages(slug: string): Promise<void> {
	const keys: string[] = [`artworks/${slug}.jpg`];
	for (const w of WIDTHS) {
		keys.push(
			`artworks/${slug}-${w}.avif`,
			`artworks/${slug}-${w}.webp`,
			`artworks/${slug}-${w}.jpg`,
		);
	}
	await deleteObjects(keys);
}
