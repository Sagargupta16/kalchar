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

	return { keys, aspectRatio };
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
