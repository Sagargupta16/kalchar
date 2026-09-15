"use client";

import { type RefObject, useLayoutEffect } from "react";

interface MobileMenuOptions {
	active: boolean;
	dialogRef: RefObject<HTMLDialogElement | null>;
	headerRef: RefObject<HTMLElement | null>;
	triggerRef: RefObject<HTMLButtonElement | null>;
	onClose: () => void;
}

/** Keep the modal active through its exit animation, then restore the current page. */
export function useMobileMenu({
	active,
	dialogRef,
	headerRef,
	triggerRef,
	onClose,
}: Readonly<MobileMenuOptions>) {
	useLayoutEffect(() => {
		const dialog = dialogRef.current;
		const header = headerRef.current;
		if (!active || !dialog || !header) return;

		const { body } = document;
		const scrollY = window.scrollY;
		const route = window.location.pathname;
		const previousStyles = {
			position: body.style.position,
			top: body.style.top,
			left: body.style.left,
			right: body.style.right,
			width: body.style.width,
		};
		const background = [...body.children]
			.filter(
				(element): element is HTMLElement =>
					element instanceof HTMLElement && !element.contains(dialog),
			)
			.map((element) => ({ element, inert: element.inert }));
		for (const { element } of background) element.inert = true;
		Object.assign(body.style, {
			position: "fixed",
			top: `-${scrollY}px`,
			left: "0",
			right: "0",
			width: "100%",
		});

		dialog.showModal();
		dialog.querySelector<HTMLElement>("#mobile-menu a")?.focus({ preventScroll: true });

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return;
			const controls = [
				...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex='0']"),
			].filter((control) => control.getClientRects().length > 0 && !control.closest("[inert]"));
			const first = controls[0];
			const last = controls.at(-1);
			if (!first || !last) return;
			const active = document.activeElement;
			if (event.shiftKey && active === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			}
		};
		const desktop = window.matchMedia("(min-width: 64rem)");
		const onDesktop = () => {
			if (desktop.matches) onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		desktop.addEventListener("change", onDesktop);
		onDesktop();
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			desktop.removeEventListener("change", onDesktop);
			dialog.close();
			for (const { element, inert } of background) element.inert = inert;
			Object.assign(body.style, previousStyles);
			if (window.location.pathname !== route) return;
			window.scrollTo(0, scrollY);
			if (desktop.matches) {
				(
					header.querySelector<HTMLElement>('nav [aria-current="page"]') ??
					header.querySelector<HTMLElement>("a")
				)?.focus({ preventScroll: true });
			} else {
				triggerRef.current?.focus({ preventScroll: true });
			}
		};
	}, [active, dialogRef, headerRef, triggerRef, onClose]);
}
