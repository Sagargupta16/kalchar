"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { isFailure } from "@/lib/action-result";
import { PENDING_MIN_MS, PENDING_SHOW_MS } from "@/lib/motion";

/**
 * How long a success line stays up before the caller clears it. 4 s is the
 * floor for web confirmations that have no persistent inline state (ux-brief);
 * errors never auto-clear.
 */
export const SAVED_BADGE_DURATION_MS = 4000;

/** @deprecated alias of PENDING_SHOW_MS in lib/motion.ts (single source, motion-elevation A3). */
export const PENDING_VISIBLE_DELAY_MS = PENDING_SHOW_MS;

const GENERIC_FAILURE = "Something went wrong. Refresh and try again.";

/**
 * True PENDING_SHOW_MS after `pending` turns true; once shown it stays for at
 * least PENDING_MIN_MS so a spinner never blinks (motion-elevation A3, Vercel
 * guidelines). Controls still disable and set aria-busy on `pending` itself;
 * only the spinner glyph keys off this value.
 */
export function usePendingVisible(pending: boolean): boolean {
	const [visible, setVisible] = useState(false);
	const shownAt = useRef(0);
	useEffect(() => {
		if (pending) {
			const id = window.setTimeout(() => {
				shownAt.current = Date.now();
				setVisible(true);
			}, PENDING_SHOW_MS);
			return () => window.clearTimeout(id);
		}
		const shownFor = Date.now() - shownAt.current;
		if (shownFor >= PENDING_MIN_MS) {
			setVisible(false);
			return;
		}
		const id = window.setTimeout(() => setVisible(false), PENDING_MIN_MS - shownFor);
		return () => window.clearTimeout(id);
	}, [pending]);
	return visible;
}

/**
 * Shared transition wrapper for admin mutations. Clears any prior error, runs
 * the server action inside a transition, fires the optional `after` callback
 * and refreshes the route on success, and surfaces a message on failure.
 *
 * Every admin manager performs the same pending/error/refresh dance; this
 * keeps it in one place so the behaviour stays consistent.
 */
export function useAdminAction(): {
	pending: boolean;
	/** `pending`, delayed by PENDING_VISIBLE_DELAY_MS: drive spinners from this, not from `pending`. */
	pendingVisible: boolean;
	err: string | null;
	run: (fn: () => Promise<unknown>, after?: () => void) => Promise<boolean>;
} {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const pendingVisible = usePendingVisible(pending);
	const [err, setErr] = useState<string | null>(null);
	const inFlight = useRef(false);

	function run(fn: () => Promise<unknown>, after?: () => void) {
		if (inFlight.current) return Promise.resolve(false);
		inFlight.current = true;
		setErr(null);
		return new Promise<boolean>((resolve) => {
			startTransition(async () => {
				try {
					const result = await fn();
					if (isFailure(result)) throw new Error(result.message);
					after?.();
					router.refresh();
					resolve(true);
				} catch (error) {
					setErr(error instanceof Error ? error.message : GENERIC_FAILURE);
					resolve(false);
				} finally {
					inFlight.current = false;
				}
			});
		});
	}

	return { pending, pendingVisible, err, run };
}

/**
 * useAdminAction plus React's useOptimistic for a reversible value (status,
 * featured, pinned, lead status). `value` flips the moment `run` starts and
 * reverts by itself when the action fails or throws; on success the
 * router.refresh() inside the transition delivers the new `base` before the
 * transition settles, so the value never flashes back. The failure message is
 * the rollback explanation: render `err` beside the control. Uploads and
 * deletes stay on useAdminAction (never optimistic).
 */
export function useOptimisticAction<T>(base: T): {
	value: T;
	pending: boolean;
	err: string | null;
	run: (next: T, fn: () => Promise<unknown>, after?: () => void) => Promise<boolean>;
} {
	const action = useAdminAction();
	const [value, setOptimistic] = useOptimistic(base);
	return {
		value,
		pending: action.pending,
		err: action.err,
		run: (next, fn, after) =>
			action.run(() => {
				setOptimistic(next);
				return fn();
			}, after),
	};
}
