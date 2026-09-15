"use client";

import { LoaderCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { UNDO_HOLD_MS } from "@/lib/motion";
import { AdminNotice } from "./admin-notice";
import { adminBtn, adminIconBtnGhost, ICON_MD } from "./controls";
import { MODAL_EXIT_MS } from "./modal";
import { BottomBar } from "./reorder-bar";
import { usePendingVisible } from "./use-admin-action";

/** @deprecated alias of UNDO_HOLD_MS in lib/motion.ts (single source; D26 superseded by the visual pass, D-A3). */
export { UNDO_HOLD_MS as UNDO_DURATION_MS } from "@/lib/motion";

const GENERIC_FAILURE = "Something went wrong. Refresh and try again.";

/** Secondary toast actions (the add-piece success: View + Add another). Max 2. */
export interface UndoBarAction {
	label: string;
	onClick: () => void;
}

interface UndoBarProps {
	/** Past-participle line naming the thing: `"Lotus garden" marked as sold`. */
	message: string;
	actionLabel?: string;
	/** The reverse action. Return the run() promise so the bar can show pending and failure. */
	onAction?: () => unknown;
	/** Plain actions for toasts with no undo (View, Add another). Never together with onAction. */
	actions?: readonly UndoBarAction[];
	onDismiss: () => void;
	pending?: boolean;
	error?: string | null;
	duration?: number;
}

/**
 * The admin's general toast (1.6), one bar at a time in the BottomBar slot:
 * status flips carry Undo (`onAction`); the add-piece success carries plain
 * `actions` (View, Add another). Never for deletes and never for errors (a
 * failed undo renders AdminNotice inside the bar and the bar stays). Polite
 * live region; dismisses on route change, on Dismiss, on Undo success, or
 * after `duration` (UNDO_HOLD_MS); the countdown pauses on hover, focus and
 * while the tab is hidden, and the bar exits at fast/ease-in (A2).
 */
export function UndoBar({
	message,
	actionLabel = "Undo",
	onAction,
	actions,
	onDismiss,
	pending = false,
	error,
	duration = UNDO_HOLD_MS,
}: Readonly<UndoBarProps>) {
	const pathname = usePathname();
	const mountedPath = useRef(pathname);
	const [held, setHeld] = useState(false);
	const [hidden, setHidden] = useState(false);
	const [closing, setClosing] = useState(false);
	const spinning = usePendingVisible(pending);
	const closeTimer = useRef<number | null>(null);
	const dismissRef = useRef(onDismiss);
	dismissRef.current = onDismiss;

	// Dismiss with the A2 exit (8px drop + fade at fast/ease-in) before unmount.
	const dismiss = useCallback((animated: boolean) => {
		if (closeTimer.current !== null) return;
		if (!animated) {
			dismissRef.current();
			return;
		}
		setClosing(true);
		closeTimer.current = window.setTimeout(() => {
			closeTimer.current = null;
			dismissRef.current();
		}, MODAL_EXIT_MS);
	}, []);

	useEffect(() => {
		return () => {
			if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
		};
	}, []);

	// Hardware Back or any tab change: the offer belongs to the page it was made on.
	useEffect(() => {
		if (pathname !== mountedPath.current) dismiss(false);
	}, [pathname, dismiss]);

	// Switching apps mid-decision never eats the window (1.6, motion-elevation A2).
	useEffect(() => {
		const sync = () => setHidden(document.hidden);
		sync();
		document.addEventListener("visibilitychange", sync);
		return () => document.removeEventListener("visibilitychange", sync);
	}, []);

	// Auto-dismiss, paused while hovered, focused, hidden, pending, or showing a failure.
	useEffect(() => {
		if (held || hidden || pending || error || closing) return;
		const id = window.setTimeout(() => dismiss(true), duration);
		return () => window.clearTimeout(id);
	}, [held, hidden, pending, error, closing, duration, dismiss]);

	return (
		<BottomBar
			role="status"
			aria-live="polite"
			className={
				closing ? "translate-y-2 opacity-0 duration-(--duration-fast) ease-(--ease-in)" : undefined
			}
		>
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
					{onAction ? (
						<button
							type="button"
							onClick={() => void onAction()}
							disabled={pending || closing}
							aria-busy={pending || undefined}
							className={adminBtn}
						>
							{spinning ? (
								<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
							) : null}
							{actionLabel}
						</button>
					) : (
						actions?.slice(0, 2).map((toastAction) => (
							<button
								key={toastAction.label}
								type="button"
								onClick={toastAction.onClick}
								disabled={pending || closing}
								className={adminBtn}
							>
								{toastAction.label}
							</button>
						))
					)}
					<button
						type="button"
						onClick={() => dismiss(true)}
						disabled={pending || closing}
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
