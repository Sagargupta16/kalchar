"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** How long the "saved" confirmation badge stays up before auto-dismissing. */
export const SAVED_BADGE_DURATION_MS = 2000;

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
	err: string | null;
	run: (fn: () => Promise<void>, after?: () => void) => void;
} {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [err, setErr] = useState<string | null>(null);

	function run(fn: () => Promise<void>, after?: () => void) {
		setErr(null);
		startTransition(async () => {
			try {
				await fn();
				after?.();
				router.refresh();
			} catch (e) {
				setErr(e instanceof Error ? e.message : "Failed.");
			}
		});
	}

	return { pending, err, run };
}
