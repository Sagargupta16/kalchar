"use client";

import { useEffect, useState } from "react";

/**
 * Reactive `prefers-reduced-motion` reader.
 *
 * Returns `false` on first render (server + pre-hydration) so SSR markup is
 * stable, then syncs to the live media query on mount and updates if the user
 * flips the OS setting. Shared by any component that gates a raw transform or
 * programmatic scroll Motion's `MotionConfig` can't reach.
 */
export function usePrefersReducedMotion(): boolean {
	const [reduce, setReduce] = useState(false);
	useEffect(() => {
		const mql = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
		setReduce(mql.matches);
		const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);
	return reduce;
}
