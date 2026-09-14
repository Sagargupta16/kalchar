"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { DUR, EASE_IN_OUT, LOOP_MOUNT_MARGIN } from "@/lib/motion";

/**
 * Organic pigment wash behind the hero plates (motion addendum H3, approved by
 * ruling 45). Two radial-gradient ellipses in the house pigments drift
 * imperceptibly over half a minute; no blur (static or animated), no lattice,
 * no beams.
 * The loops mount only while the hero is near the viewport (LOOP_MOUNT_MARGIN)
 * so document.getAnimations() drains once the visitor scrolls past, and the
 * reduced-motion rendition is the same wash, static. The host Container is
 * `relative isolate` so -z-10 keeps the wash above the section ground but
 * under every plate and line of copy.
 */

const WASH_A_STYLE = {
	background:
		"radial-gradient(closest-side, color-mix(in oklch, var(--color-marigold) 10%, transparent), transparent)",
} as const;
/** Section-accent ellipse: 8% in light; dark:opacity-75 lands the 6% dark stop. */
const WASH_B_STYLE = {
	background:
		"radial-gradient(closest-side, color-mix(in oklch, var(--section-accent) 8%, transparent), transparent)",
} as const;

/** Travel in px, from the H3 recipe (translate(-40px, 0) to translate(40px, 24px)). */
const DRIFT_A = { x: [-40, 40, -40], y: [0, 24, 0], scale: [1, 1.06, 1] };
/** Counter-phase drift so the two washes never read as one moving sheet. */
const DRIFT_B = { x: [32, -32, 32], y: [16, -12, 16], scale: [1.04, 1, 1.04] };

const WASH_A_CLASS = "absolute -top-1/4 -left-1/4 h-3/4 w-2/3 rounded-full";
const WASH_B_CLASS = "absolute -right-1/4 bottom-0 h-2/3 w-1/2 rounded-full dark:opacity-75";

export function HeroWash() {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { margin: LOOP_MOUNT_MARGIN });
	const reduceMotion = usePrefersReducedMotion();
	const drift = inView && !reduceMotion;

	return (
		<div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
			{drift ? (
				<>
					<motion.div
						className={WASH_A_CLASS}
						style={WASH_A_STYLE}
						animate={DRIFT_A}
						transition={{ duration: DUR.ambient, ease: EASE_IN_OUT, repeat: Infinity }}
					/>
					<motion.div
						className={WASH_B_CLASS}
						style={WASH_B_STYLE}
						animate={DRIFT_B}
						transition={{ duration: DUR.ambient, ease: EASE_IN_OUT, repeat: Infinity }}
					/>
				</>
			) : (
				<>
					<div className={WASH_A_CLASS} style={WASH_A_STYLE} />
					<div className={WASH_B_CLASS} style={WASH_B_STYLE} />
				</>
			)}
		</div>
	);
}
