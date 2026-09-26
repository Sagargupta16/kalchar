"use client";

import { type RefObject, useLayoutEffect, useRef, useState } from "react";

/**
 * idle = it was on screen when it mounted, so it stays static (no flash of
 * SSR text disappearing); armed = below the fold, held in the from-state;
 * in = scrolled into view, the CSS entrance plays (components/motion/kinetic.css).
 */
export type ViewRevealState = "idle" | "armed" | "in";

/** Trigger a touch before the element's top clears the fold so the entrance is seen. */
const VIEW_MARGIN = "0px 0px -12% 0px";

/**
 * One IntersectionObserver per host; the CSS owns every keyframe, so the
 * host's children animate on the compositor (transform, opacity, clip-path)
 * and a static accessibility audit can finish them via getAnimations().
 * Motion stays on regardless of the OS reduced-motion preference.
 */
export function useViewReveal<T extends Element>(): [RefObject<T | null>, ViewRevealState] {
	const ref = useRef<T>(null);
	const [state, setState] = useState<ViewRevealState>("idle");

	useLayoutEffect(() => {
		const node = ref.current;
		if (!node || typeof IntersectionObserver === "undefined") return;
		const rect = node.getBoundingClientRect();
		if (rect.top < globalThis.innerHeight && rect.bottom > 0) return;
		setState("armed");
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				setState("in");
				observer.disconnect();
			},
			{ rootMargin: VIEW_MARGIN },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return [ref, state];
}
