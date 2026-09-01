"use server";

/**
 * Presigned upload tickets for admin image uploads.
 *
 * Vercel rejects any function request body over ~4.5 MB at the edge, before the
 * server action runs, so image bytes cannot ride inside a server action's
 * FormData: a single full-resolution phone photo exceeds the cap and the upload
 * fails with a 413 the action never observes. Instead the browser asks for a
 * ticket, PUTs the master straight to R2, and hands the resulting staged key to
 * the mutation action. Only the key crosses the function boundary.
 *
 * The ticket is the authorization point: every request re-checks the maintainer
 * session, so an anonymous caller cannot obtain write access to the bucket.
 */
import { type ActionResult, failure } from "@/lib/action-result";
import { assertUploadAllowed, stagingKey } from "@/lib/storage/image-upload";
import { presignUpload } from "@/lib/storage/r2";
import { requireMaintainer } from "./_helpers";

export interface UploadTicket {
	/** Staged R2 key to hand back to the mutation action. */
	key: string;
	/** Presigned PUT URL the browser uploads the master to. */
	url: string;
}

/**
 * Issue one presigned PUT for a staged master the browser is about to upload.
 * Returns failures as data rather than throwing, so the real reason reaches the
 * admin UI in production instead of a sanitized digest (see lib/action-result).
 */
export async function createUploadTicket(
	contentType: string,
	size: number,
): Promise<ActionResult<UploadTicket>> {
	try {
		await requireMaintainer();
		assertUploadAllowed(contentType, size);
		const key = stagingKey();
		return { ok: true, key, url: await presignUpload(key, contentType, size) };
	} catch (error) {
		console.error("createUploadTicket failed", error);
		return failure(error);
	}
}
