"use client";

import { LoaderCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminNotice } from "./admin-notice";
import { adminBtn, adminIconBtnGhost, ICON_MD } from "./controls";
import { BottomBar } from "./reorder-bar";
import { usePendingVisible } from "./use-admin-action";

/** How long an undo offer stays before it dismisses itself (D26: 6 s). Restarts after hover, focus or a pending undo ends. */
export const UNDO_DURATION_MS = 6000;

const GENERIC_FAILURE = "Something went wrong. Refresh and try again.";

interface UndoBarProps {
	/** Past-participle line naming the thing: `"Lotus garden" marked as sold`. */
	message: string;
	actionLabel?: string;
	/** The reverse action. Return the run() promise so the bar can show pending and failure. */
	onAction: () => unknown;
	onDismiss: () => void;
	pending?: boolean;
	error?: string | null;
	duration?: number;
}

/**
 * Undo v1 (D26): one offer at a time, in the ReorderBar slot above the tab
 * bar, for status flips whose reverse action exists (status, featured,
 * pinned, lead status). Never for deletes (soft delete is DEF3 / DEF16).
 * Polite live region; dismisses on route change, on Dismiss, on Undo
 * success, or after `duration`. A manager renders ReorderBar OR UndoBar,
 * never both.
 */
export function UndoBar({
	message,
	actionLabel = "Undo",
	onAction,
	onDismiss,
	pending = false,
	error,
	duration = UNDO_DURATION_MS,
}: Readonly<UndoBarProps>) {
	const pathname = usePathname();
	const mountedPath = useRef(pathname);
	const [held, setHeld] = useState(false);
	const spinning = usePendingVisible(pending);

	// Hardware Back or any tab change: the offer belongs to the page it was made on.
	useEffect(() => {
		if (pathname !== mountedPath.current) onDismiss();
	}, [pathname, onDismiss]);

	// Auto-dismiss, paused while hovered, focused, pending, or showing a failure.
	useEffect(() => {
		if (held || pending || error) return;
		const id = window.setTimeout(onDismiss, duration);
		return () => window.clearTimeout(id);
	}, [held, pending, error, duration, onDismiss]);

	return (
		<BottomBar role="status" aria-live="polite">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: hover and focus only pause the auto-dismiss timer; the buttons inside carry the interaction */}
			<div
				className="contents"
				onPointerEnter={() => setHeld(true)}
				onPointerLeave={() => setHeld(false)}
				onFocus={() => setHeld(true)}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
				}}
			>
				{error ? (
					<AdminNotice variant="error" className="min-w-0 flex-1">
						{error}
					</AdminNotice>
				) : (
					<p className="min-w-0 flex-1 truncate text-sm text-ink">{message}</p>
				)}
				<div className="flex shrink-0 items-center gap-3">
					<button
						type="button"
						onClick={() => void onAction()}
						disabled={pending}
						aria-busy={pending || undefined}
						className={adminBtn}
					>
						{spinning ? (
							<LoaderCircle
								size={ICON_MD}
								aria-hidden="true"
								className="motion-safe:animate-spin"
							/>
						) : null}
						{actionLabel}
					</button>
					<button
						type="button"
						onClick={onDismiss}
						aria-label="Dismiss"
						className={adminIconBtnGhost}
					>
						<X size={ICON_MD} aria-hidden="true" />
					</button>
				</div>
			</div>
		</BottomBar>
	);
}

export interface UndoOffer {
	message: string;
	/**
	 * The RAW reverse server action (`() => setArtworkStatus(slug, previous)`),
	 * optionally preceded by the manager's own optimistic dispatch. `undoNow`
	 * hands it to the manager's `run`, which handles failure-as-data and the
	 * refresh. Never wrap it in that same `run`: the hook's `inFlight` guard
	 * returns false at once (use-admin-action.ts) and the undo would no-op.
	 */
	action: () => Promise<unknown>;
}

/**
 * Manager-side state for one undo offer. `offer` replaces any earlier offer
 * (one at a time, D26). Wire it as:
 *   {hasChanges ? <ReorderBar .../> : undo ? <UndoBar message={undo.message} pending={undoPending} error={undoError} onAction={undoNow} onDismiss={dismissUndo} /> : null}
 */
export function useUndo(run: (fn: () => Promise<unknown>, after?: () => void) => Promise<boolean>) {
	const [undo, setUndo] = useState<UndoOffer | null>(null);
	const [undoPending, setUndoPending] = useState(false);
	const [undoError, setUndoError] = useState<string | null>(null);
	const dismissUndo = useCallback(() => {
		setUndo(null);
		setUndoError(null);
	}, []);
	const offerUndo = useCallback((next: UndoOffer) => {
		setUndoError(null);
		setUndo(next);
	}, []);
	const undoNow = useCallback(async () => {
		if (!undo) return;
		setUndoPending(true);
		const ok = await run(undo.action, dismissUndo);
		setUndoPending(false);
		if (!ok) setUndoError(GENERIC_FAILURE);
	}, [undo, run, dismissUndo]);
	return { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow };
}
