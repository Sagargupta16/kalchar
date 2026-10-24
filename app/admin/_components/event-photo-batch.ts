"use client";

/**
 * Multi-photo event uploads: stage each photo, process in parallel, commit once.
 *
 * Each photo is several seconds of variant encoding, so a batch inside one
 * action overran the 60 second function budget. The browser stages every master
 * straight to R2 a few at a time, then calls processEventPhoto for a few photos
 * at a time (each call is its own function invocation, so they run in parallel)
 * and finally hands the finished key-bases to createEvent or attachEventPhotos
 * in one ordered write. Both steps succeed or fail per photo: a dropped upload
 * or an unreadable photo is named in the notice while the rest are saved.
 * Sequencing lives in lib/event-photo-batch.ts and the per-photo bookkeeping in
 * lib/event-photo-selection.ts (both pure, tested); this file only wires them to
 * the form data and the server actions. The create form passes the `files`
 * React state as the `images` entries, so anything the strip removed or
 * reordered is what gets staged.
 */
import { type ActionResult, type Failure, isFailure } from "@/lib/action-result";
import { formString } from "@/lib/admin-helpers";
import { type BatchProgress, GENERIC_FAILURE, processInParallel } from "@/lib/event-photo-batch";
import {
	bySelection,
	describeFailedPhotos,
	type SelectionFailure,
	type SelectionResult,
} from "@/lib/event-photo-selection";
import { formatBytes } from "@/lib/utils";
import {
	attachEventPhotos,
	createEvent,
	processEventPhoto,
	reserveEventId,
} from "../event-actions";
import { stageImage } from "./stage-image";

// Mirrors the staging and server write limits; validate the whole selection before uploading.
const PHOTO_BATCH_LIMIT = 12;
const PHOTO_SIZE_LIMIT_MB = 20;
export const EVENT_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const PHOTO_TYPES = new Set(EVENT_PHOTO_ACCEPT.split(","));
/** Masters uploading at once. Direct browser-to-R2 PUTs parallelise well; more only queues in the browser. */
const STAGING_CONCURRENCY = 3;

export function validateEventPhotos(files: readonly File[]): string | null {
	if (files.length > PHOTO_BATCH_LIMIT) {
		return `Choose up to ${PHOTO_BATCH_LIMIT} photos at a time. You picked ${files.length}.`;
	}
	for (const file of files) {
		if (file.size === 0) return `"${file.name}" is empty. Choose another photo.`;
		if (file.size > PHOTO_SIZE_LIMIT_MB * 1024 * 1024) {
			return `"${file.name}" is ${formatBytes(file.size)}. Photos must be ${PHOTO_SIZE_LIMIT_MB} MB or smaller.`;
		}
		if (!PHOTO_TYPES.has(file.type.toLowerCase())) {
			return `"${file.name}" must be a JPG, PNG or WebP photo.`;
		}
	}
	return null;
}

function selectedPhotos(formData: FormData): File[] {
	return formData
		.getAll("images")
		.filter((value): value is File => value instanceof File && value.name !== "");
}

export interface BatchHandlers {
	/** Called as the masters upload to R2, with the share of bytes sent. */
	onStaging?: (fraction: number) => void;
	/** Called each time a photo finishes processing. */
	onProgress?: (progress: BatchProgress) => void;
	/** Called with the selection index as each photo finishes, saved or failed (per-tile progress edges, N1). */
	onPhotoDone?: (index: number) => void;
	/** Called once when some photos failed but the rest were saved, with the failed selection indexes. */
	onPartial: (notice: string, failed: readonly number[]) => void;
}

/** Copy every field except the picked files: image bytes never travel through a server action. */
function withoutPhotos(source: FormData): FormData {
	const out = new FormData();
	for (const [name, value] of source.entries()) {
		if (name !== "images") out.append(name, value);
	}
	return out;
}

/**
 * Stage every photo to R2 a few at a time. A photo that fails to upload is
 * recorded with its reason and the rest carry on. A failed photo counts as
 * fully sent, so the progress edges still reach the processing step.
 */
async function stagePhotos(files: readonly File[], handlers: BatchHandlers) {
	// Overall progress is bytes sent over bytes selected, so a big photo does not
	// make the bar jump when a small one finishes first.
	const totalBytes = files.reduce((sum, file) => sum + file.size, 0) || 1;
	const sent = files.map(() => 0);
	const report = (index: number, fraction: number) => {
		sent[index] = fraction * (files[index] as File).size;
		handlers.onStaging?.(sent.reduce((a, b) => a + b, 0) / totalBytes);
	};
	const outcome = await processInParallel(
		files.map((file) => file.name),
		async (_, index) => {
			try {
				const key = await stageImage(files[index] as File, (fraction) => report(index, fraction));
				return { ok: true as const, keyBase: key };
			} catch (error) {
				report(index, 1);
				handlers.onPhotoDone?.(index);
				throw error;
			}
		},
		{ concurrency: STAGING_CONCURRENCY },
	);
	return bySelection(
		files.map((_, index) => index),
		outcome,
	);
}

/** Process the staged photos under the event's own prefix, keeping their selection indexes. */
async function processPhotos(
	eventId: string,
	staged: readonly SelectionResult[],
	handlers: BatchHandlers,
) {
	const outcome = await processInParallel(
		staged.map((photo) => photo.key),
		(key, n) =>
			processEventPhoto(eventId, key).finally(() =>
				handlers.onPhotoDone?.((staged[n] as SelectionResult).index),
			),
		{ onProgress: handlers.onProgress },
	);
	return bySelection(
		staged.map((photo) => photo.index),
		outcome,
	);
}

function nothingSaved(failures: readonly SelectionFailure[]): Failure {
	return { ok: false, message: failures[0]?.message ?? GENERIC_FAILURE };
}

/**
 * Stage, then process, every photo. A photo can fail at either step without
 * stopping the others; only when every photo fails is the batch a failure, so
 * nothing is written and the caller keeps the whole selection for a retry.
 * `target` resolves the event the photos belong to, after at least one staged.
 */
async function uploadPhotos(
	files: readonly File[],
	handlers: BatchHandlers,
	target: () => Promise<ActionResult<{ id: string }>>,
): Promise<ActionResult<{ id: string; keyBases: string[]; failures: SelectionFailure[] }>> {
	const staging = await stagePhotos(files, handlers);
	if (files.length > 0 && staging.done.length === 0) return nothingSaved(staging.failures);
	const event = await target();
	if (isFailure(event)) return event;
	const processing = await processPhotos(event.id, staging.done, handlers);
	const failures = [...staging.failures, ...processing.failures].sort((a, b) => a.index - b.index);
	if (files.length > 0 && processing.done.length === 0) return nothingSaved(failures);
	return { ok: true, id: event.id, keyBases: processing.done.map((photo) => photo.key), failures };
}

/**
 * Create an event with its photos. Reserves the id first so the photos can be
 * processed under the event's own prefix before the row exists. A failed
 * reservation or create returns its envelope unchanged so the form keeps its
 * input; if some photos fail the event is created with the rest and the notice
 * names exactly which to add again.
 */
export async function createEventWithPhotos(
	formData: FormData,
	handlers: BatchHandlers,
): Promise<ActionResult<{ id: string }>> {
	if (!formString(formData, "title").trim()) {
		return { ok: false, message: "Enter a title." };
	}
	const files = selectedPhotos(formData);
	const problem = validateEventPhotos(files);
	if (problem) return { ok: false, message: problem };
	const upload = await uploadPhotos(files, handlers, reserveEventId);
	if (isFailure(upload)) return upload;

	const fields = withoutPhotos(formData);
	fields.set("eventId", upload.id);
	for (const keyBase of upload.keyBases) fields.append("imageKeyBases", keyBase);
	const created = await createEvent(fields);
	if (isFailure(created)) return created;

	const notice = describeFailedPhotos(files, upload.keyBases.length, upload.failures, false);
	if (notice)
		handlers.onPartial(
			notice,
			upload.failures.map((failure) => failure.index),
		);
	return created;
}

/**
 * Add photos to an existing event. If every photo fails nothing is saved, so
 * the failure is returned and the selection is kept for a retry; otherwise the
 * successes are attached in one write and the failures are reported through
 * onPartial. The notice tells the maintainer the failed photos are still
 * selected, so the caller keeps exactly those for the next Upload photos.
 */
export async function addEventPhotos(
	eventId: string,
	formData: FormData,
	handlers: BatchHandlers,
): Promise<ActionResult<{ images: string[] }>> {
	const files = selectedPhotos(formData);
	if (files.length === 0) return { ok: false, message: "Choose one or more photos." };
	const problem = validateEventPhotos(files);
	if (problem) return { ok: false, message: problem };
	const upload = await uploadPhotos(files, handlers, () =>
		Promise.resolve<ActionResult<{ id: string }>>({ ok: true, id: eventId }),
	);
	if (isFailure(upload)) return upload;

	const attached = await attachEventPhotos(eventId, upload.keyBases);
	if (isFailure(attached)) return attached;

	const notice = describeFailedPhotos(files, upload.keyBases.length, upload.failures, true);
	if (notice)
		handlers.onPartial(
			notice,
			upload.failures.map((failure) => failure.index),
		);
	return { ok: true, images: upload.keyBases };
}
