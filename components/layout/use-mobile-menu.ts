"use client";

import { type RefObject, useEffect } from "react";

/** Keep the full-screen menu usable with touch, keyboard and screen readers. */
export function useMobileMenu(
	open: boolean,
	headerRef: RefObject<HTMLElement | null>,
	triggerRef: RefObject<HTMLButtonElement | null>,
	onClose: () => void,
) {
	useEffect(() => {
		const header = headerRef.current;
		if (!open || !header) return;

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
					element instanceof HTMLElement && !element.contains(header),
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

		header.querySelector<HTMLElement>("#mobile-menu a")?.focus({ preventScroll: true });

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
				return;
			}
			if (event.key !== "Tab") return;
			const controls = [
				...header.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex='0']"),
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
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			desktop.removeEventListener("change", onDesktop);
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
	}, [open, headerRef, triggerRef, onClose]);
}
