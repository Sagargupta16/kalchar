"use client";

import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Floating "back to top" affordance, pinned to the bottom-right of the
 * viewport. Replaces the old footer link so the action is reachable from
 * anywhere on a long page, not just the very bottom.
 *
 * Reveals only after the reader has scrolled roughly one viewport down, so
 * it never clutters the first screen, and yields (fades out) while the
 * footer's bottom bar is on screen so the FAQ and credit links stay tappable
 * (chrome-7; the footer renders the [data-fab-sentinel] it observes). The
 * offset ADDS the safe-area insets to the 20px margin (chrome-8) plus
 * --fixed-bar-h while a page publishes a fixed bottom bar (the /work/[slug]
 * enquiry bar). Rests at e3, hovers to e4 (M3 FAB rungs; motion addendum C3).
 * Hidden on /admin (which owns the bottom-right zone with its own mobile tab
 * bar). Reduced motion -> instant jump and no fade transition.
 */
export function BackToTop() {
	const [visible, setVisible] = useState(false);
	const [footerInView, setFooterInView] = useState(false);
	const thresholdRef = useRef<HTMLSpanElement>(null);
	const reduceMotion = usePrefersReducedMotion();
	const pathname = usePathname();
	const onAdmin = pathname?.startsWith("/admin");

	useEffect(() => {
		const threshold = thresholdRef.current;
		if (onAdmin || !threshold) return;
		const observer = new IntersectionObserver(([entry]) => setVisible(!entry?.isIntersecting));
		observer.observe(threshold);
		const sentinel = document.querySelector("[data-fab-sentinel]");
		const footerObserver = sentinel
			? new IntersectionObserver(([entry]) => setFooterInView(Boolean(entry?.isIntersecting)))
			: null;
		if (sentinel && footerObserver) footerObserver.observe(sentinel);
		return () => {
			observer.disconnect();
			footerObserver?.disconnect();
		};
	}, [onAdmin]);

	if (onAdmin) return null;

	const shown = visible && !footerInView;

	return (
		<>
			<span
				ref={thresholdRef}
				aria-hidden="true"
				className="pointer-events-none absolute left-0 top-[90vh] h-px w-px"
			/>
			<button
				type="button"
				aria-label="Back to top"
				onClick={() => globalThis.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
				className={cn(
					"group fixed z-nav grid size-control place-items-center rounded-full border border-line bg-surface/90 text-ink shadow-e3 backdrop-blur-md transition-ui pressable hover:-translate-y-0.5 hover:border-accent hover:text-accent-text hover:shadow-e4",
					"bottom-[calc(var(--spacing-safe-bottom)+--spacing(5)+var(--fixed-bar-h,0px))] right-[calc(var(--spacing-safe-right)+--spacing(5))]",
					shown
						? "pointer-events-auto translate-y-0 opacity-100"
						: "pointer-events-none translate-y-2 opacity-0",
					reduceMotion && "transition-none",
				)}
			>
				<ArrowUp size={20} aria-hidden="true" />
			</button>
		</>
	);
}
