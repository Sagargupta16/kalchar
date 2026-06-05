/**
 * Reports whether the visitor has a fine, hover-capable pointer (a mouse or
 * trackpad) rather than a coarse one (touch). Returns true only for
 * `(hover: hover) and (pointer: fine)`.
 *
 * Use this to gate pointer-only flourishes -- the 3D card tilt + glare, the
 * Lenis smooth-scroll easing -- so touch devices get plain native behaviour.
 * Touch scroll momentum is the browser's job; intercepting it with JS physics
 * is what makes phones feel janky.
 *
 * Starts `false` (the SSR/first-paint value), then reads the real capability in
 * an effect, so it never causes a hydration mismatch. Pairs with
 * usePrefersReducedMotion for the full "is this animation allowed" gate.
 */
"use client";

import { useEffect, useState } from "react";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

export function useFinePointer(): boolean {
	const [finePointer, setFinePointer] = useState(false);

	useEffect(() => {
		const mq = globalThis.matchMedia(FINE_POINTER_QUERY);
		setFinePointer(mq.matches);
		const onChange = (e: MediaQueryListEvent) => setFinePointer(e.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	return finePointer;
}
