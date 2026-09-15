"use client";

import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
 * enquiry bar), and the html:has([data-enquire-fab]) rule in animations.css
 * lifts it one FAB slot whenever the floating WhatsApp disc is mounted
 * (visual-direction 2.14). The disc sits on the shared iOS-material recipe
 * (steering 2026-09-14): surface tint at the 85% glass fill over static
 * backdrop blur + saturate from the --glass-* knobs, staying solid where
 * backdrop-filter is unsupported; the border-line hairline and the e3 rest /
 * e4 hover rungs are kept (M3 FAB rungs; motion addendum C3). It stays still
 * on purpose: the WhatsApp disc one slot below carries the idle breath, and
 * two loops in the same corner would read busy.
 * Hidden on /admin (which owns the bottom-right zone with its own mobile tab
 * bar). Scroll-to-top remains smooth on supported browsers.
 */
export function BackToTop() {
	const [visible, setVisible] = useState(false);
	const [footerInView, setFooterInView] = useState(false);
	const thresholdRef = useRef<HTMLSpanElement>(null);
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
				data-back-to-top=""
				inert={!shown || undefined}
				aria-label="Back to top"
				onClick={() => globalThis.scrollTo({ top: 0, behavior: "smooth" })}
				className={cn(
					"group fixed z-nav grid size-control place-items-center rounded-full border border-line bg-surface text-ink shadow-e3 backdrop-blur-(--glass-blur) backdrop-saturate-(--glass-saturate) transition-ui pressable supports-[backdrop-filter]:bg-surface/85 hover:-translate-y-0.5 hover:border-(--color-gold-hairline) hover:text-accent-text hover:shadow-e4",
					"bottom-[calc(var(--spacing-safe-bottom)+--spacing(5)+var(--fixed-bar-h,0px))] right-[calc(var(--spacing-safe-right)+--spacing(5))]",
					shown
						? "pointer-events-auto translate-y-0 opacity-100"
						: "pointer-events-none translate-y-2 opacity-0",
				)}
			>
				<ArrowUp size={20} aria-hidden="true" />
			</button>
		</>
	);
}
