import type { KeyboardEvent } from "react";

export interface ViewerKeyboardActions {
	onClose: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
	/** Home / End jump to the first / last piece. */
	onFirst?: () => void;
	onLast?: () => void;
	/** + / - step the zoom level; vertical arrows pan while zoomed. */
	onZoomIn?: () => void;
	onZoomOut?: () => void;
	onArrowUp?: () => void;
	onArrowDown?: () => void;
}

function isFocusableControl(control: HTMLElement): boolean {
	return (
		control.tabIndex >= 0 &&
		!control.matches(":disabled") &&
		// Hidden lightbox chrome keeps client rects but must leave the focus cycle.
		!control.closest("[inert]") &&
		control.getClientRects().length > 0
	);
}

function trapViewerFocus(event: KeyboardEvent<HTMLDialogElement>) {
	const controls = [
		...event.currentTarget.querySelectorAll<HTMLElement>(
			"a[href], button, input, select, textarea, [tabindex]",
		),
	].filter(isFocusableControl);
	const first = controls[0];
	const last = controls.at(-1);
	if (!first || !last) return;
	const active = document.activeElement;
	const atBoundary = event.shiftKey ? active === first : active === last;
	if (atBoundary || !(active instanceof HTMLElement) || !controls.includes(active)) {
		event.preventDefault();
		(event.shiftKey ? last : first).focus();
	}
}

export function handleViewerKeyDown(
	event: KeyboardEvent<HTMLDialogElement>,
	actions: Readonly<ViewerKeyboardActions>,
) {
	// Thumbnail navigation owns its arrow keys; do not page twice.
	if (event.defaultPrevented) return;
	if (event.key === "Escape") {
		event.preventDefault();
		event.stopPropagation();
		actions.onClose();
		return;
	}
	if (event.key === "Tab") {
		trapViewerFocus(event);
		return;
	}
	if (
		event.target instanceof HTMLElement &&
		event.target.closest("input, textarea, select, [contenteditable=true]")
	) {
		return;
	}

	const shortcuts = new Map<string, (() => void) | undefined>([
		["ArrowRight", actions.onNext],
		["ArrowLeft", actions.onPrevious],
		["ArrowUp", actions.onArrowUp],
		["ArrowDown", actions.onArrowDown],
		["Home", actions.onFirst],
		["End", actions.onLast],
		["+", actions.onZoomIn],
		["=", actions.onZoomIn],
		["-", actions.onZoomOut],
	]);
	const action = shortcuts.get(event.key);
	if (!action) return;
	event.preventDefault();
	action();
}
