"use client";

import { X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { DRAG_CLOSE_FRACTION, DRAG_VELOCITY_PX_S, DUR } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { adminIconBtnGhost, ICON_MD } from "./controls";

let openDialogs = 0;
let previousOverflow = "";

/** How long the exit transition runs before the consumer may unmount (A1: fast, ease-in). */
export const MODAL_EXIT_MS = DUR.fast * 1000;

/**
 * Consumer-side half of the A1 exit: `requestClose` flips `closing` (pass it
 * to the Modal prop so the panel runs its fast ease-in exit) and calls
 * `onClosed` after MODAL_EXIT_MS (immediately under reduced motion). Modal
 * cannot defer its own `onClose`: consumers may veto a close (dirty checks,
 * inline confirm steps), so the deferral belongs to the state owner.
 */
export function useModalExit(onClosed: () => void): {
	closing: boolean;
	requestClose: () => void;
} {
	const [closing, setClosing] = useState(false);
	const reduce = usePrefersReducedMotion();
	const timer = useRef<number | null>(null);
	const done = useRef(onClosed);
	done.current = onClosed;

	useEffect(() => {
		return () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		};
	}, []);

	const requestClose = useCallback(() => {
		if (timer.current !== null) return;
		if (reduce) {
			done.current();
			return;
		}
		setClosing(true);
		timer.current = window.setTimeout(() => {
			timer.current = null;
			setClosing(false);
			done.current();
		}, MODAL_EXIT_MS);
	}, [reduce]);

	return { closing, requestClose };
}

interface ModalProps {
	/** Accessible name of the dialog; also the visible header text unless `heading` is given. */
	title: string;
	/** Visible header content when it differs from the accessible name (thumb + piece title); `title` stays the aria name. */
	heading?: ReactNode;
	/** Id of the element that carries the title when the consumer renders it itself (the confirm dialog); the header is then not rendered. */
	titleId?: string;
	/** Id of the body text, wired to aria-describedby. */
	describedBy?: string;
	/** center = dialog card at every width (confirms, small choices); sheet = full-height panel below sm, the same card from sm (D14). */
	placement?: "center" | "sheet";
	/**
	 * Only with placement="sheet". full = today's full-height editor (text
	 * entry; X, Escape, backdrop close). content = bottom-anchored quick-choice
	 * sheet (grabber, 62dvh cap, drag-to-close), the centred card from sm.
	 */
	detent?: "full" | "content";
	/**
	 * md = 28rem card from sm (confirms, quick-state sheet); lg = 32rem (the editor).
	 * @deprecated `sm` is an alias of `md` for one release; integration removes it.
	 */
	size?: "sm" | "md" | "lg";
	/** Header start slot. Default: the X button (aria-label "Close", adminIconBtnGhost) calling onClose. Pass null to omit. */
	leading?: ReactNode | null;
	/** Header end slot: at most one primary action (the editor's Save changes). */
	action?: ReactNode;
	/** DEPRECATED alias for a visible header with the default X; `placement="sheet"`, `leading` or `action` also show the header. Integration deletes. */
	showClose?: boolean;
	/** While true the panel runs its exit (fast, ease-in; A1). Drive it with useModalExit and unmount after MODAL_EXIT_MS. */
	closing?: boolean;
	/** The one close path: X, backdrop tap, Escape and the grabber drag all call it, so a consumer's dirty check covers all three. */
	onClose: () => void;
	children: ReactNode;
}

// Fill and elevation live on the placement variants, not the base: the
// center card and the full editor sheet stay opaque (form legibility, dense
// tool), while the content detent carries the iOS material below.
const PANEL_BASE =
	"relative z-raised flex w-full flex-col overflow-hidden text-ink starting:opacity-0 motion-safe:transition-[opacity,translate,scale] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)";
const PANEL_CENTER =
	"max-h-[calc(100dvh-1.5rem)] rounded-(--radius-md) border border-line bg-surface-raised shadow-e5 starting:scale-95 sm:max-h-[calc(100dvh-2rem)]";
const PANEL_SHEET =
	"h-dvh max-h-none rounded-none border-0 bg-surface-raised shadow-e5 starting:translate-y-4 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-(--radius-md) sm:border sm:border-line sm:starting:translate-y-0 sm:starting:scale-95";
// Content detent (1.7): bottom-anchored, content height capped at --sheet-peek
// (62dvh), top corners only, enters on the sheet curve; the centred card from
// sm. Steering 2026-09-14: the quick-choice sheet is the iOS material surface
// (material-glass-strong: translucent raised tint, static blur, hairline +
// e4 in one box-shadow list with an opaque fallback), so it carries no
// border-* or shadow-* utilities of its own.
const PANEL_SHEET_CONTENT =
	"material-glass-strong h-auto max-h-(--sheet-peek) rounded-t-(--radius-sheet) rounded-b-none starting:translate-y-4 motion-safe:ease-(--ease-sheet) sm:max-h-[calc(100dvh-2rem)] sm:rounded-(--radius-md) sm:starting:translate-y-0 sm:starting:scale-95 sm:motion-safe:ease-(--ease-out)";
// A1 exit: fast, ease-in, back to the pre-open pose.
const PANEL_CLOSING =
	"opacity-0 motion-safe:duration-(--duration-fast) motion-safe:ease-(--ease-in)";
const SIZE: Record<"sm" | "md" | "lg", string> = {
	sm: "sm:max-w-md",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
};
const DIALOG =
	"fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-transparent text-ink open:grid backdrop:bg-scrim/40 pointer-fine:backdrop:backdrop-blur-sm dark:backdrop:bg-scrim/60";
const DIALOG_CENTER = "place-items-center p-3 sm:p-4";
const DIALOG_SHEET = "place-items-stretch p-0 sm:place-items-center sm:p-4";
const DIALOG_SHEET_CONTENT =
	"place-items-end justify-items-stretch p-0 sm:place-items-center sm:justify-items-center sm:p-4";

/**
 * Native modal dialogs isolate background content, trap focus, and give only
 * the topmost dialog Escape handling, including nested confirmations. On
 * phones `placement="sheet"` fills the viewport (X top-left, primary action
 * top-right, body scrolls, footer on the safe area); from sm it is the card.
 * `detent="content"` is the bottom quick-choice sheet with a grabber and
 * drag-to-close (1.7); the keyboard-friendly editor stays on the full detent.
 */
export function Modal({
	title,
	heading,
	titleId,
	describedBy,
	placement = "center",
	detent = "full",
	size = "md",
	leading,
	action,
	showClose = false,
	closing = false,
	onClose,
	children,
}: Readonly<ModalProps>) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const generatedTitleId = useId();
	const labelledBy = titleId ?? generatedTitleId;
	const contentDetent = placement === "sheet" && detent === "content";
	const showHeader =
		placement === "sheet" || showClose || leading !== undefined || action !== undefined;
	const drag = useRef<{ pointerId: number; startY: number; startTime: number; lastY: number }>(
		null,
	);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		const trigger = document.activeElement;
		if (openDialogs === 0) {
			previousOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
		}
		openDialogs += 1;
		dialog.showModal();
		return () => {
			dialog.close();
			openDialogs -= 1;
			if (openDialogs === 0) document.body.style.overflow = previousOverflow;
			if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
		};
	}, []);

	function trapTab(event: React.KeyboardEvent<HTMLDialogElement>) {
		const dialog = dialogRef.current;
		if (event.key !== "Tab" || !dialog || event.defaultPrevented) return;
		if (event.target instanceof Element && event.target.closest("dialog") !== dialog) return;
		const controls = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				"button, [href], input, select, textarea, [tabindex], [contenteditable]",
			),
		).filter(
			(control) =>
				control.tabIndex >= 0 &&
				!control.matches(":disabled") &&
				control.getClientRects().length > 0 &&
				!control.closest("[inert]"),
		);
		const first = controls[0];
		const last = controls.at(-1);
		if (!first || !last) {
			event.preventDefault();
			dialog.focus();
		} else if (!controls.includes(document.activeElement as HTMLElement)) {
			event.preventDefault();
			(event.shiftKey ? last : first).focus();
		} else if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	// Drag-to-close (content detent, priority 2): pointer-down on the grabber
	// zone follows the finger with translateY; releasing past a quarter of the
	// panel height or faster than DRAG_VELOCITY_PX_S closes; otherwise the
	// panel eases back. Never `drag` on the whole panel: the body scrolls.
	function onGrabberPointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (!contentDetent) return;
		drag.current = {
			pointerId: event.pointerId,
			startY: event.clientY,
			startTime: performance.now(),
			lastY: event.clientY,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
		const panel = panelRef.current;
		if (panel) panel.style.transition = "none";
	}

	function onGrabberPointerMove(event: React.PointerEvent<HTMLDivElement>) {
		const state = drag.current;
		const panel = panelRef.current;
		if (!state || state.pointerId !== event.pointerId || !panel) return;
		state.lastY = event.clientY;
		const delta = Math.max(0, event.clientY - state.startY);
		panel.style.translate = `0 ${delta}px`;
	}

	function onGrabberPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
		const state = drag.current;
		const panel = panelRef.current;
		if (!state || state.pointerId !== event.pointerId || !panel) return;
		drag.current = null;
		const delta = Math.max(0, state.lastY - state.startY);
		const seconds = Math.max((performance.now() - state.startTime) / 1000, 0.001);
		const pastFraction = delta > panel.offsetHeight * DRAG_CLOSE_FRACTION;
		const pastVelocity = delta / seconds > DRAG_VELOCITY_PX_S;
		panel.style.transition = "";
		if (delta > 0 && (pastFraction || pastVelocity)) {
			onClose();
			return;
		}
		panel.style.translate = "";
	}

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			onKeyDown={trapTab}
			onCancel={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onClose();
			}}
			className={cn(
				DIALOG,
				placement !== "sheet" && DIALOG_CENTER,
				placement === "sheet" && (contentDetent ? DIALOG_SHEET_CONTENT : DIALOG_SHEET),
			)}
		>
			<div
				ref={panelRef}
				className={cn(
					PANEL_BASE,
					placement !== "sheet" && PANEL_CENTER,
					placement === "sheet" && (contentDetent ? PANEL_SHEET_CONTENT : PANEL_SHEET),
					SIZE[size],
					closing && PANEL_CLOSING,
					closing && (placement === "sheet" ? "translate-y-4" : "scale-95"),
				)}
			>
				{contentDetent ? (
					<>
						<div
							aria-hidden="true"
							className="absolute inset-x-0 top-0 z-10 h-11 cursor-grab touch-none active:cursor-grabbing"
							onPointerDown={onGrabberPointerDown}
							onPointerMove={onGrabberPointerMove}
							onPointerUp={onGrabberPointerEnd}
							onPointerCancel={onGrabberPointerEnd}
						/>
						<div
							data-grabber=""
							aria-hidden="true"
							className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong"
						/>
					</>
				) : null}
				{showHeader ? (
					<div className="flex min-h-control items-center gap-3 border-b border-line px-(--card-pad) py-3">
						{leading === undefined ? (
							<button
								type="button"
								onClick={onClose}
								aria-label="Close"
								className={adminIconBtnGhost}
							>
								<X size={ICON_MD} aria-hidden="true" />
							</button>
						) : (
							leading
						)}
						<h2
							id={heading ? undefined : labelledBy}
							className="t-heading min-w-0 flex-1 truncate text-lg"
						>
							{heading ?? title}
						</h2>
						{action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
					</div>
				) : null}
				{!showHeader && !titleId ? (
					<h2 id={labelledBy} className="sr-only">
						{title}
					</h2>
				) : null}
				{showHeader && heading ? (
					<h2 id={labelledBy} className="sr-only">
						{title}
					</h2>
				) : null}
				{children}
			</div>
			<button
				type="button"
				tabIndex={-1}
				aria-label={`Close ${title}`}
				onClick={onClose}
				className="absolute inset-0 cursor-default"
			/>
		</dialog>
	);
}

/** Scrollable dialog body; the page behind never rubber-bands when it reaches its end. */
export function ModalBody({
	children,
	className,
}: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<div className={cn("flex-1 overflow-y-auto overscroll-contain p-(--card-pad)", className)}>
			{children}
		</div>
	);
}

/** Dialog footer on the canvas tone; sits on the home-indicator inset in the phone sheet. */
export function ModalFooter({
	children,
	className,
}: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 border-t border-line bg-canvas px-(--card-pad) py-3 pb-[max(0.75rem,var(--spacing-safe-bottom))] sm:pb-3",
				className,
			)}
		>
			{children}
		</div>
	);
}
