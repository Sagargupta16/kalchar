"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { DUR, REVEAL_DISTANCE, REVEAL_VIEWPORT_MARGIN } from "@/lib/motion";

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
 * resampled. The entrance runs once when the plate reaches the viewport.
 */
export function LeadUnveil({
	children,
	className,
}: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<motion.li
			data-motion-reveal
			className={className}
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
