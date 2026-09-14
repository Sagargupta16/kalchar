"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { DUR, REVEAL_DISTANCE, REVEAL_VIEWPORT_MARGIN } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * M3 emphasized-decelerate, mirroring --ease-emphatic. Local constant pending
 * an EASE_EMPHATIC export from lib/motion.ts (shared file, vu-foundations
 * lane; BUILD-RULES shared-file rule).
 */
const EASE_EMPHATIC = [0.05, 0.7, 0.1, 1] as const;

/**
 * The spanning lead tile's single-plate unveil (visual-direction 2.1 / 1.7):
 * a 700ms clip-path reveal at --ease-emphatic riding a block-distance rise
 * (steering 2026-09-14: the unveil alone read like a late image; the rise
 * makes the lead's entrance visible but tasteful, and the shared PlateFrame
 * group lift carries the hover) when the tile scrolls into view. Reveal's
 * `unveil` prop only reaches the eager CSS path, which fires at page load;
 * home grids sit below the fold, so the lead needs the in-view Motion path at
 * DUR.unveil instead. Clip-path plus transform only: the painting is never
 * resampled. Reduced motion renders a plain list item; because the hook
 * reports false during SSR, the motion form also carries an important
 * motion-reduce clip-path override so the server-rendered tile is never
 * hidden from a reduced-motion visitor before hydration (visual-direction
 * 1.8 "never disappear": the shared [data-motion-reveal] rescue rule covers
 * opacity and transform -- including this rise -- but not clip-path).
 */
export function LeadUnveil({
	children,
	className,
}: Readonly<{ children: ReactNode; className?: string }>) {
	const reduceMotion = usePrefersReducedMotion();
	if (reduceMotion) {
		return <li className={className}>{children}</li>;
	}
	return (
		<motion.li
			data-motion-reveal
			// The trailing ! outranks Motion's SSR'd inline initial clip, exactly
			// as the shared reduced block does for opacity.
			className={cn("motion-reduce:[clip-path:none]!", className)}
			initial={{ clipPath: "inset(0% 0% 100% 0%)", y: REVEAL_DISTANCE.block }}
			whileInView={{
				clipPath: "inset(0% 0% 0% 0%)",
				y: 0,
				// Release the clip once the unveil lands so the card's hover lift and
				// shadow are never cropped by the list item (anti-pattern 3).
				transitionEnd: { clipPath: "none" },
			}}
			viewport={{ once: true, margin: REVEAL_VIEWPORT_MARGIN }}
			transition={{ duration: DUR.unveil, ease: EASE_EMPHATIC }}
		>
			{children}
		</motion.li>
	);
}
