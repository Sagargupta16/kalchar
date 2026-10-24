/**
 * Browser-side downscale before an admin photo is staged to R2.
 *
 * The site never serves more than 1600 px (VARIANT_WIDTHS) and the stored
 * master fallback is capped at 2000 px, so the extra pixels of a 4000 px phone
 * photo only cost upload time on mobile data. Photos whose long edge is above
 * PHOTO_UPLOAD_MAX_EDGE are redrawn to that edge as JPEG before the PUT. The
 * step fails open: anything that cannot be decoded, drawn or re-encoded here,
 * or that would not get smaller, uploads unchanged, and the server stays the
 * judge of what is accepted.
 */

/** Long edge sent to storage: headroom over the 2000 px master fallback. */
export const PHOTO_UPLOAD_MAX_EDGE = 2400;
/** JPEG quality for the redrawn photo; the server re-encodes every variant anyway. */
export const PHOTO_UPLOAD_QUALITY = 0.9;

/**
 * Target size for a photo, or null when it already fits within `maxEdge` (or
 * its size is unusable). Keeps the aspect ratio and never enlarges.
 */
export function downscaleSize(
	width: number,
	height: number,
	maxEdge = PHOTO_UPLOAD_MAX_EDGE,
): { width: number; height: number } | null {
	if (!(width > 0 && height > 0)) return null;
	const longEdge = Math.max(width, height);
	if (longEdge <= maxEdge) return null;
	const scale = maxEdge / longEdge;
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

function encodeJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_UPLOAD_QUALITY));
}

// One decode at a time: a full-size phone photo is 50 MB or more once decoded,
// and a batch stages several photos at once. Running out of memory crashes the
// tab instead of throwing, so the redraws queue while the uploads overlap.
let decoding: Promise<unknown> = Promise.resolve();

/**
 * Return a smaller JPEG copy of `file` when its long edge is above the limit,
 * otherwise `file` itself. EXIF orientation is applied while decoding, so the
 * redrawn pixels are upright and need no orientation tag. The original name is
 * kept so error messages still name the photo the maintainer picked.
 */
export function downscalePhoto(file: File): Promise<File> {
	const result = decoding.then(() => redraw(file));
	decoding = result.catch(() => undefined);
	return result;
}

async function redraw(file: File): Promise<File> {
	if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
	let bitmap: ImageBitmap | undefined;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
		const size = downscaleSize(bitmap.width, bitmap.height);
		if (!size) return file;
		const canvas = document.createElement("canvas");
		canvas.width = size.width;
		canvas.height = size.height;
		const context = canvas.getContext("2d");
		if (!context) return file;
		// JPEG has no transparency: paint white under a PNG or WebP instead of black.
		context.fillStyle = "white";
		context.fillRect(0, 0, size.width, size.height);
		context.imageSmoothingQuality = "high";
		context.drawImage(bitmap, 0, 0, size.width, size.height);
		const blob = await encodeJpeg(canvas);
		if (!blob || blob.size === 0 || blob.size >= file.size) return file;
		return new File([blob], file.name, { type: "image/jpeg", lastModified: file.lastModified });
	} catch {
		return file;
	} finally {
		bitmap?.close();
	}
}
