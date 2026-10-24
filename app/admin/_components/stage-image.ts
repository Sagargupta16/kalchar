"use client";

/**
 * Browser side of the presigned upload flow (see app/admin/upload-actions.ts).
 *
 * Uploads the chosen master straight to R2 and returns the staged key for the
 * mutation action, so the image bytes never pass through a server action and
 * never meet Vercel's ~4.5 MB request-body cap. Photos larger than the site
 * can use are downscaled in the browser first (lib/photo-downscale.ts), so a
 * phone on mobile data sends a fraction of the original bytes.
 */
import { unwrap } from "@/lib/action-result";
import { downscalePhoto } from "@/lib/photo-downscale";
import { createUploadTicket } from "../upload-actions";

const MAX_IMAGE_MB = 20;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Check the file locally before asking for a ticket. The server re-validates
 * both the ticket request and the stored bytes; this exists so an obvious
 * mistake reads as a clear message instead of a round trip.
 */
function assertUsable(file: File): void {
	if (file.size === 0) throw new Error("That file is empty.");
	if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
		throw new Error(
			`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. Images must be ${MAX_IMAGE_MB} MB or smaller.`,
		);
	}
	if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
		throw new Error(`"${file.name}" must be a JPEG, PNG, or WebP image.`);
	}
}

/** Upload one master to R2 and resolve with its staged key. */
export async function stageImage(
	file: File,
	onProgress?: (fraction: number) => void,
): Promise<string> {
	assertUsable(file);
	// The limits apply to the photo as picked; the upload may be a smaller copy.
	const upload = await downscalePhoto(file);
	// Re-throw the server's message here: thrown messages survive in the
	// browser, whereas Next sanitizes anything thrown inside the action.
	const { key, url } = unwrap(await createUploadTicket(upload.type.toLowerCase(), upload.size));

	await putWithProgress(url, upload, onProgress);
	return key;
}

/**
 * PUT the file to the presigned URL, reporting bytes sent. fetch() cannot
 * observe upload progress, so this is the one place XMLHttpRequest is used.
 */
function putWithProgress(url: string, file: File, onProgress?: (fraction: number) => void) {
	return new Promise<void>((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open("PUT", url);
		// Must match the signed content type, or R2 rejects the signature.
		request.setRequestHeader("Content-Type", file.type.toLowerCase());
		request.upload.onprogress = (event) => {
			if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
		};
		request.onload = () => {
			if (request.status >= 200 && request.status < 300) {
				onProgress?.(1);
				resolve();
			} else {
				reject(new Error(`Upload of "${file.name}" failed (${request.status}). Please try again.`));
			}
		};
		request.onerror = () => {
			reject(new Error(`Upload of "${file.name}" failed. Check the connection and try again.`));
		};
		request.send(file);
	});
}
