"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";
import { DUR, EASE_OUT } from "@/lib/motion";

/**
 * Admin route change: the new page fades in on an 8px rise at DUR.fast
 * (inside the travel contract's base ceiling). Next mounts a fresh template
 * per navigation; the first mount (the full page load) never animates, so the
 * server HTML is visible at once and hydration matches.
 *
 * WAAPI on the individual `translate` property with no fill: the moment the
 * run ends nothing stays applied, so this wrapper never becomes the
 * containing block for the position: fixed bars inside a page (ReorderBar,
 * UndoBar) after the transition (the reason app/template.tsx is opacity-only).
 */
let seenFirstMount = false;

export default function AdminTemplate({ children }: Readonly<{ children: ReactNode }>) {
	const ref = useRef<HTMLDivElement>(null);
	// Verdict recorded once per instance: Strict Mode (dev) re-runs mount
	// effects, and the second run must not read the flag its first run set.
	const isLaterNavigation = useRef<boolean | null>(null);

	useLayoutEffect(() => {
		if (isLaterNavigation.current === null) {
			isLaterNavigation.current = seenFirstMount;
			seenFirstMount = true;
		}
		if (!isLaterNavigation.current) return;
		const run = ref.current?.animate(
			[
				{ opacity: 0, translate: "0 8px" },
				{ opacity: 1, translate: "0 0" },
			],
			{ duration: DUR.fast * 1000, easing: `cubic-bezier(${EASE_OUT.join(", ")})` },
		);
		return () => run?.cancel();
	}, []);

	return <div ref={ref}>{children}</div>;
}
