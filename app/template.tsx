"use client";

import { type ReactNode, useEffect, useState } from "react";

/**
 * Per-navigation wrapper. Next.js mounts a FRESH `template.tsx` instance on
 * every route change (unlike `layout.tsx`, which persists), so it's the hook
 * for a soft page-enter animation.
 *
 * LCP-safe + hydration-safe: the render is ALWAYS un-animated, so the server
 * HTML and the first client render agree (no hydration mismatch) and the
 * LCP-critical first paint is never gated behind an opacity fade. A
 * module-level flag, flipped in an effect (never during render), tells the
 * initial load apart from later navigations: the first template instance sets
 * the flag and never animates; every later instance sees it set and animates
 * the new page in via state.
 *
 * Reduced-motion makes `.page-enter` a no-op (handled in globals.css).
 */
let seenFirstMount = false;

export default function Template({ children }: Readonly<{ children: ReactNode }>) {
	const [animate, setAnimate] = useState(false);

	useEffect(() => {
		if (seenFirstMount) {
			setAnimate(true);
		} else {
			seenFirstMount = true;
		}
	}, []);

	return <div className={animate ? "page-enter" : undefined}>{children}</div>;
}
