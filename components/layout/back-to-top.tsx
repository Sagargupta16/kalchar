"use client";

import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

/**
 * Floating "back to top" affordance, pinned to the bottom-right of the
 * viewport. Replaces the old footer link so the action is reachable from
 * anywhere on a long page, not just the very bottom.
 *
 * Reveals only after the reader has scrolled roughly one viewport down, so
 * it never clutters the first screen. Hidden on /admin (which owns the
 * bottom-right zone with its own mobile tab bar). Reduced motion -> instant
 * jump and no fade transition.
 */
/** Reveal the button once the reader is ~90% of a viewport down the page. */
const REVEAL_VIEWPORT_RATIO = 0.9;

export function BackToTop() {
	const [visible, setVisible] = useState(false);
	const reduceMotion = usePrefersReducedMotion();
	const pathname = usePathname();
	const onAdmin = pathname?.startsWith("/admin");

	useEffect(() => {
		if (onAdmin) return;
		let ticking = false;
		function onScroll() {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				setVisible(globalThis.scrollY > globalThis.innerHeight * REVEAL_VIEWPORT_RATIO);
				ticking = false;
			});
		}
		onScroll();
		globalThis.addEventListener("scroll", onScroll, { passive: true });
		return () => globalThis.removeEventListener("scroll", onScroll);
	}, [onAdmin]);

	if (onAdmin) return null;

	return (
		<button
			type="button"
			aria-label="Back to top"
			onClick={() => globalThis.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
			className={`group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-line bg-bg/90 text-ink shadow-e4 backdrop-blur-md transition-all duration-(--duration-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-accent hover:text-accent ${
				visible
					? "pointer-events-auto translate-y-0 opacity-100"
					: "pointer-events-none translate-y-2 opacity-0"
			} ${reduceMotion ? "transition-none" : ""}`}
		>
			<ArrowUp size={18} aria-hidden="true" />
		</button>
	);
}
