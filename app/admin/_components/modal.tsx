"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Accessible modal shell shared by the confirm dialog and the artwork editor.
 *
 * Handles the cross-cutting concerns once: role=dialog + aria-modal, focus
 * moved in on open and restored on close, ESC to close, Tab trapped inside,
 * body-scroll lock, and backdrop-click to dismiss. Mobile-friendly: the panel
 * is capped at the viewport height and scrolls internally, so a tall form
 * still fits a short phone screen (and respects the safe-area inset).
 */
export function Modal({
	title,
	onClose,
	children,
	size = "sm",
	showClose = false,
}: Readonly<{
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	size?: "sm" | "lg";
	/** Show an explicit X button in the header (used by the editor). */
	showClose?: boolean;
}>) {
	const panelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		triggerRef.current = document.activeElement as HTMLElement | null;
		// Focus the first focusable control in the panel.
		const focusable = panelRef.current?.querySelector<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);
		focusable?.focus();

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}
			if (e.key === "Tab" && panelRef.current) {
				const items = panelRef.current.querySelectorAll<HTMLElement>(
					'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
				);
				if (items.length === 0) return;
				const first = items[0];
				const last = items[items.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		};
		document.addEventListener("keydown", onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
			triggerRef.current?.focus?.();
		};
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-[100] grid place-items-center p-3 sm:p-4">
			{/* Backdrop */}
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
			/>
			{/* Panel */}
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
				className={`relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-(--radius-md) border border-line bg-bg shadow-e5 sm:max-h-[calc(100dvh-2rem)] ${
					size === "lg" ? "max-w-lg" : "max-w-sm"
				}`}
			>
				{showClose ? (
					<div className="flex items-center justify-between border-b border-line px-5 py-3.5">
						<h2 id="modal-title" className="t-display text-lg">
							{title}
						</h2>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="grid h-8 w-8 place-items-center rounded-(--radius-sm) text-muted transition-colors hover:bg-bg-soft hover:text-ink"
						>
							<X size={16} />
						</button>
					</div>
				) : null}
				{children}
			</div>
		</div>
	);
}
