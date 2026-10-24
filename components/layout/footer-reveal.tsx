"use client";

import type { ReactNode } from "react";
import { useViewReveal } from "@/components/motion/use-view-reveal";

/**
 * View-reveal host for the footer: sets data-reveal on its wrapper so the
 * wordmark halves rise out of their masks and the column rule draws in when
 * the footer scrolls into view (components/layout/chrome.css). A footer
 * already on screen at mount (short pages) stays static.
 */
export function FooterReveal({
	children,
	className,
}: Readonly<{ children: ReactNode; className?: string }>) {
	const [ref, state] = useViewReveal<HTMLDivElement>();
	return (
		<div ref={ref} data-motion-reveal data-reveal={state} className={className}>
			{children}
		</div>
	);
}
