/**
 * Parallel processing for multi-photo event uploads.
 *
 * Every photo costs several seconds of variant encoding, so a whole batch inside
 * one server action overran the 60 second function budget. The browser now
 * stages every master to R2, asks the server to process the photos a few at a
 * time (each call is its own function invocation, so they really run in
 * parallel), then commits the finished key-bases in one ordered write.
 *
 * This module is the pure part: no React, FormData or server actions, so
 * lib/event-photo-batch.test.ts can pin its behaviour. The wiring lives in
 * app/admin/_components/event-photo-batch.ts.
 */
import { type ActionResult, isFailure } from "./action-result";

export interface BatchProgress {
	/** Photos that have finished, whether they succeeded or failed. */
	done: number;
	total: number;
}

export interface PhotoFailure {
	/** 1-based position in the maintainer's selection. */
	position: number;
	message: string;
}

export interface ParallelOutcome {
	total: number;
	/** Key-bases of the photos that processed, in selection order. */
	keyBases: string[];
	failures: PhotoFailure[];
}

export const GENERIC_FAILURE = "Something went wrong. Please try again.";

/** Photos in flight at once. Each is a separate function invocation on the server. */
export const DEFAULT_CONCURRENCY = 4;

type Slot = { keyBase: string } | { message: string };

/**
 * Run `step` for every key with bounded concurrency, collecting each result by
 * its original position so the outcome preserves selection order. A failure
 * envelope or a thrown error records that photo as failed and the rest carry
 * on. `onProgress` fires each time a photo finishes.
 */
export async function processInParallel(
	keys: readonly string[],
	step: (key: string, index: number) => Promise<ActionResult<{ keyBase: string }>>,
	options: { concurrency?: number; onProgress?: (progress: BatchProgress) => void } = {},
): Promise<ParallelOutcome> {
	const total = keys.length;
	const workers = Math.max(1, Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, total || 1));
	const slots: Array<Slot | undefined> = new Array(total);
	let next = 0;
	let done = 0;

	const worker = async () => {
		while (next < total) {
			const index = next;
			next += 1;
			const key = keys[index] as string;
			try {
				const result = await step(key, index);
				if (isFailure(result)) slots[index] = { message: result.message };
				else if (typeof result.keyBase === "string" && result.keyBase) {
					slots[index] = { keyBase: result.keyBase };
				} else slots[index] = { message: GENERIC_FAILURE };
			} catch (error) {
				slots[index] = { message: error instanceof Error ? error.message : GENERIC_FAILURE };
			}
			done += 1;
			options.onProgress?.({ done, total });
		}
	};
	await Promise.all(Array.from({ length: workers }, worker));

	const keyBases: string[] = [];
	const failures: PhotoFailure[] = [];
	slots.forEach((slot, index) => {
		if (!slot) return;
		if ("keyBase" in slot) keyBases.push(slot.keyBase);
		else failures.push({ position: index + 1, message: slot.message });
	});
	return { total, keyBases, failures };
}
