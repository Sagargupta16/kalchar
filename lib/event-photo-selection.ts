/**
 * Pure helpers for the admin event photo picker: merging repeated picks into
 * one selection, and mapping a batch's per-photo results back onto that
 * selection so each failed photo is named and can be picked out for a retry.
 *
 * No React, DOM or server actions, so lib/event-photo-selection.test.ts can pin
 * the behaviour. The wiring lives in app/admin/_components/event-photo-batch.ts.
 */
import { GENERIC_FAILURE, type ParallelOutcome } from "./event-photo-batch";

type PickedFile = Pick<File, "name" | "size" | "lastModified">;

/** The same photo picked twice has the same name, size and modification time. */
export function photoFileKey(file: PickedFile): string {
	return `${file.name}-${file.size}-${file.lastModified}`;
}

/** Add a new pick after the current selection, skipping photos that are already in it. */
export function mergePhotoFiles<T extends PickedFile>(
	current: readonly T[],
	incoming: readonly T[],
): T[] {
	const seen = new Set(current.map(photoFileKey));
	const merged = [...current];
	for (const file of incoming) {
		const key = photoFileKey(file);
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(file);
	}
	return merged;
}

/** A photo that finished a batch step, by its 0-based index in the selection. */
export interface SelectionResult {
	index: number;
	/** What the step produced: the staged key, or the processed key-base. */
	key: string;
}

/** A photo that failed a batch step, by its 0-based index in the selection. */
export interface SelectionFailure {
	index: number;
	message: string;
}

/**
 * Map a processInParallel outcome over part of the selection back onto it.
 * `indexes[n]` is the selection index of the n-th key that was run.
 */
export function bySelection(
	indexes: readonly number[],
	outcome: ParallelOutcome,
): { done: SelectionResult[]; failures: SelectionFailure[] } {
	const failed = new Map(
		outcome.failures.map((failure) => [failure.position - 1, failure.message]),
	);
	const done: SelectionResult[] = [];
	const failures: SelectionFailure[] = [];
	let next = 0;
	indexes.forEach((index, n) => {
		const message = failed.get(n);
		if (message !== undefined) {
			failures.push({ index, message });
			return;
		}
		done.push({ index, key: outcome.keyBases[next] as string });
		next += 1;
	});
	return { done, failures };
}

function failureReason(name: string, message: string): string {
	const reason = (message || GENERIC_FAILURE).replace(/\.?$/, ".");
	// Upload errors already quote the file name; do not say it twice.
	return reason.includes(`"${name}"`) ? reason : `"${name}" failed: ${reason}`;
}

/**
 * Sentence for a batch where some photos failed, or null when every photo was
 * saved. Each failed photo is named by its file name, which the selection
 * strip also shows under the thumbnail. `kept` means the failed photos are
 * still selected, so the maintainer can upload them again in one tap.
 */
export function describeFailedPhotos(
	files: readonly Pick<File, "name">[],
	saved: number,
	failures: readonly SelectionFailure[],
	kept: boolean,
): string | null {
	if (failures.length === 0) return null;
	const one = failures.length === 1;
	const reasons = failures
		.map(({ index, message }) => failureReason(files[index]?.name ?? `Photo ${index + 1}`, message))
		.join(" ");
	const them = one ? "it" : "them";
	const photos = one ? "that photo" : `those ${failures.length} photos`;
	const next = kept
		? `${one ? "It is" : "They are"} still selected below. Choose Upload photos to send ${them} again.`
		: `Select ${photos} and add ${them} again.`;
	return `Saved ${saved} of ${files.length} photos. ${reasons} ${next}`;
}
