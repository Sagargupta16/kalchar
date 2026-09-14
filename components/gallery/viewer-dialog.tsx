"use client";

import { X } from "lucide-react";
import { type MotionValue, motion } from "motion/react";
import {
	type ButtonHTMLAttributes,
	forwardRef,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { DUR, EASE_IN, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Floating icon control over a photo panel: translucent raised surface, hairline
 *  edge, 44px, press cue, global focus outline. Used for Close and Previous / Next. */
export const LIGHTBOX_ICON_BUTTON =
	"grid size-control shrink-0 place-items-center rounded-full border border-line/40 bg-surface-raised/80 text-ink shadow-e2 backdrop-blur transition-ui pressable hover:text-accent-text";

export const LightboxIconButton = forwardRef<
	HTMLButtonElement,
	ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => (
	<button ref={ref} type={type} className={cn(LIGHTBOX_ICON_BUTTON, className)} {...props} />
));
LightboxIconButton.displayName = "LightboxIconButton";

interface ViewerDialogProps {
	children: ReactNode;
	label?: string;
	labelledBy?: string;
	onClose: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
	/** Home / End jump to the first / last piece (visual-direction 2.4). */
	onFirst?: () => void;
	onLast?: () => void;
	/** + / - step the zoom level; ArrowUp / ArrowDown pan while zoomed. */
	onZoomIn?: () => void;
	onZoomOut?: () => void;
	onArrowUp?: () => void;
	onArrowDown?: () => void;
	/** Live opacity for the deep scrim while a drag-to-dismiss is in flight. */
	scrimOpacity?: MotionValue<number>;
}

/** Native modal focus/inert behavior, outside any transformed gallery card.
 *  The room is the deep warm ink (--color-scrim-deep, identical in both
 *  modes); chrome on it follows the house scrim convention (text-bg
 *  dark:text-ink). The scrim lives on an inner layer so a downward drag can
 *  track its opacity without fading the plate. */
export function ViewerDialog({
	children,
	label,
	labelledBy,
	onClose,
	onNext,
	onPrevious,
	onFirst,
	onLast,
	onZoomIn,
	onZoomOut,
	onArrowUp,
	onArrowDown,
	scrimOpacity,
}: Readonly<ViewerDialogProps>) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

	useEffect(() => setPortalTarget(document.body), []);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!portalTarget || !dialog) return;
		const trigger = document.activeElement;
		const previousOverflow = document.body.style.overflow;
		dialog.showModal();
		closeRef.current?.focus({ preventScroll: true });
		document.body.style.overflow = "hidden";
		return () => {
			dialog.close();
			document.body.style.overflow = previousOverflow;
			if (trigger instanceof HTMLElement && trigger.isConnected) {
				trigger.focus({ preventScroll: true });
			}
		};
	}, [portalTarget]);

	if (!portalTarget) return null;

	return createPortal(
		<motion.dialog
			ref={dialogRef}
			aria-label={label}
			aria-labelledby={labelledBy}
			aria-modal="true"
			data-lenis-prevent
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
			onKeyDown={(event) => {
				if (event.key === "Tab") {
					const controls = [
						...event.currentTarget.querySelectorAll<HTMLElement>(
							"a[href], button, input, select, textarea, [tabindex]",
						),
					].filter(
						(control) =>
							control.tabIndex >= 0 &&
							!control.matches(":disabled") &&
							// Inert chrome (hidden by the lightbox single-tap toggle) is
							// invisible but keeps client rects; skip it like the browser does.
							!control.closest("[inert]") &&
							control.getClientRects().length > 0,
					);
					const first = controls[0];
					const last = controls.at(-1);
					if (!first || !last) return;
					const active = document.activeElement;
					const atBoundary = event.shiftKey ? active === first : active === last;
					if (atBoundary || !(active instanceof HTMLElement) || !controls.includes(active)) {
						event.preventDefault();
						(event.shiftKey ? last : first).focus();
					}
				} else if (event.key === "ArrowRight" && onNext) {
					event.preventDefault();
					onNext();
				} else if (event.key === "ArrowLeft" && onPrevious) {
					event.preventDefault();
					onPrevious();
				} else if (event.key === "ArrowUp" && onArrowUp) {
					event.preventDefault();
					onArrowUp();
				} else if (event.key === "ArrowDown" && onArrowDown) {
					event.preventDefault();
					onArrowDown();
				} else if (event.key === "Home" && onFirst) {
					event.preventDefault();
					onFirst();
				} else if (event.key === "End" && onLast) {
					event.preventDefault();
					onLast();
				} else if ((event.key === "+" || event.key === "=") && onZoomIn) {
					event.preventDefault();
					onZoomIn();
				} else if (event.key === "-" && onZoomOut) {
					event.preventDefault();
					onZoomOut();
				}
			}}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } }}
			transition={{ duration: DUR.base, ease: EASE_OUT }}
			className="fixed inset-0 m-0 h-dvh w-screen max-h-none max-w-none items-center justify-center border-0 bg-transparent p-4 text-bg open:flex backdrop:bg-transparent dark:text-ink md:p-8"
		>
			{/* The room: deep warm ink at 95 percent, tracked by drag-to-dismiss. */}
			<motion.div
				aria-hidden="true"
				style={scrimOpacity ? { opacity: scrimOpacity } : undefined}
				className="pointer-events-none absolute inset-0 bg-scrim-deep/95"
			/>
			<button
				type="button"
				tabIndex={-1}
				aria-hidden="true"
				aria-label="Close lightbox"
				onClick={onClose}
				className="absolute inset-0 cursor-zoom-out"
			/>
			<LightboxIconButton
				ref={closeRef}
				onClick={onClose}
				aria-label="Close"
				className="absolute right-safe-right top-safe-top z-raised mr-4 mt-4"
			>
				<X size={18} aria-hidden="true" />
			</LightboxIconButton>
			{children}
		</motion.dialog>,
		portalTarget,
	);
}
