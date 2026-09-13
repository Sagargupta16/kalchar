"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { adminIconBtnGhost, ICON_MD } from "./controls";

let openDialogs = 0;
let previousOverflow = "";

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
	/** The one close path: X, backdrop tap and Escape all call it, so a consumer's dirty check covers all three. */
	onClose: () => void;
	children: ReactNode;
}

const PANEL_BASE =
	"relative z-raised flex w-full flex-col overflow-hidden bg-surface-raised text-ink shadow-e5 starting:opacity-0 motion-safe:transition-[opacity,translate,scale] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)";
const PANEL_CENTER =
	"max-h-[calc(100dvh-1.5rem)] rounded-(--radius-md) border border-line starting:scale-95 sm:max-h-[calc(100dvh-2rem)]";
const PANEL_SHEET =
	"h-dvh max-h-none rounded-none border-0 starting:translate-y-4 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-(--radius-md) sm:border sm:border-line sm:starting:translate-y-0 sm:starting:scale-95";
const SIZE: Record<"sm" | "md" | "lg", string> = {
	sm: "sm:max-w-md",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
};
const DIALOG =
	"fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-transparent text-ink open:grid backdrop:bg-scrim/40 pointer-fine:backdrop:backdrop-blur-sm dark:backdrop:bg-scrim/60";
const DIALOG_CENTER = "place-items-center p-3 sm:p-4";
const DIALOG_SHEET = "place-items-stretch p-0 sm:place-items-center sm:p-4";

/**
 * Native modal dialogs isolate background content, trap focus, and give only
 * the topmost dialog Escape handling, including nested confirmations. On
 * phones `placement="sheet"` fills the viewport (X top-left, primary action
 * top-right, body scrolls, footer on the safe area); from sm it is the card.
 */
export function Modal({
	title,
	heading,
	titleId,
	describedBy,
	placement = "center",
	size = "md",
	leading,
	action,
	showClose = false,
	onClose,
	children,
}: Readonly<ModalProps>) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const generatedTitleId = useId();
	const labelledBy = titleId ?? generatedTitleId;
	const showHeader =
		placement === "sheet" || showClose || leading !== undefined || action !== undefined;

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
			className={cn(DIALOG, placement === "sheet" ? DIALOG_SHEET : DIALOG_CENTER)}
		>
			<div
				className={cn(PANEL_BASE, placement === "sheet" ? PANEL_SHEET : PANEL_CENTER, SIZE[size])}
			>
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
